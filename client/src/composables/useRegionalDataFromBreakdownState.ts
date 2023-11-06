import _ from 'lodash';
import { Ref, ref } from '@vue/reactivity';
import { watchEffect } from '@vue/runtime-core';
import { AdminLevel } from '@/types/Enums';
import { OutputSpecWithId, RegionalAggregation, RegionalAggregations } from '@/types/Outputdata';
import { ADMIN_LEVEL_KEYS, REGION_ID_DELIMETER } from '@/utils/admin-level-util';
import { getTimestampMillis } from '@/utils/date-util';
import { BreakdownState, Indicator, Model } from '@/types/Datacube';
import {
  isBreakdownStateQualifiers,
  isBreakdownStateRegions,
  isBreakdownStateYears,
} from '@/utils/datacube-util';
import {
  fetchAvailableYears,
  getBulkRegionalData,
  getRegionAggregation,
  getRegionAggregationWithQualifiers,
} from '@/services/outputdata-service';

const combineRegionAggregationList = (
  regionAggregationList: RegionalAggregation[],
  timeseriesIds: string[]
): RegionalAggregations => {
  const regionalAggregations: RegionalAggregations = {
    country: [],
    admin1: [],
    admin2: [],
    admin3: [],
  };
  regionAggregationList.forEach((regionalAggregation, index) => {
    const timeseriesId = timeseriesIds[index];
    Object.values(AdminLevel).forEach((adminLevel) => {
      const regionAggsAtCurrentAdminLevelForCurrentTimeseries =
        regionalAggregation[adminLevel] || [];
      const updatedRegionAggsATCurrentAdminLevel = regionalAggregations[adminLevel] ?? [];
      regionAggsAtCurrentAdminLevelForCurrentTimeseries.forEach((regionAgg) => {
        const existingEntryForCurrentRegionAgg = updatedRegionAggsATCurrentAdminLevel.find(
          (existingEntry) => existingEntry.id === regionAgg.id
        );
        if (existingEntryForCurrentRegionAgg === undefined) {
          updatedRegionAggsATCurrentAdminLevel.push({
            id: regionAgg.id,
            values: { [timeseriesId]: regionAgg.value },
          });
        } else {
          existingEntryForCurrentRegionAgg.values[timeseriesId] = regionAgg.value;
        }
      });
      regionalAggregations[adminLevel] = updatedRegionAggsATCurrentAdminLevel;
    });
  });
  return regionalAggregations;
};

const applySplitByRegion = (
  regionalData: RegionalAggregations,
  specs: OutputSpecWithId[],
  relativeTo?: string | null,
  referenceOptions?: string[] | null
) => {
  if (specs.length === 0) return regionalData;
  const ancestorCount = specs[0].id?.split(REGION_ID_DELIMETER).length - 1;
  const selectedAdminLevels = [ADMIN_LEVEL_KEYS[ancestorCount]];

  /*
    If we have reference options (which this case will always be country option as we
    don't get to this split when other splits with other reference options are selected),
    then we add country to the selected admin regions, so we can get the correct data
    for each active admin level.
  */
  if (referenceOptions && referenceOptions.length > 0) {
    selectedAdminLevels.push(ADMIN_LEVEL_KEYS[0]);
  }
  const clonedData = _.cloneDeep(regionalData);

  const valuesAtSelectedLevel = clonedData[selectedAdminLevels[0]];
  if (valuesAtSelectedLevel === undefined) return regionalData;
  // Since "split by region" is active, each output spec's ID is the ID of a
  //  timeseries, and there is one timeseries for each selected region.
  const timeseriesIds = specs.map((spec) => spec.id);
  // Assign the value for each selected region to the the corresponding
  //  timeseries ID (eventually this will be used to color it)
  selectedAdminLevels.forEach((selectedAdminLevel) => {
    clonedData[selectedAdminLevel] = clonedData[selectedAdminLevel]?.map(
      ({ id: regionId, values }) => {
        const filteredValues = {} as any;
        // ASSUMPTION: this processing step only occurs when a single outputSpec
        //  was fed into getRegionAggregations, so there is at most one key-value
        //  pair in `values`
        Object.values(values).forEach((value) => {
          if (timeseriesIds.includes(regionId)) {
            filteredValues[regionId] = value;
          }
        });
        return {
          id: regionId,
          values: filteredValues,
        };
      }
    );
  });
  // When relativeTo mode is on, add baseline value to each region
  // '_baseline' property is special private property to store the baseline value
  if (!relativeTo) return clonedData;
  // Find baseline value
  const baselineValue = selectedAdminLevels.reduce(
    (baseVal: number | undefined, selectedAdminLevel) => {
      const relativeData = clonedData[selectedAdminLevel]?.find(({ id }) => id === relativeTo);
      if (relativeData && timeseriesIds.includes(relativeData.id)) {
        return relativeData.values[relativeData.id];
      }
      return baseVal;
    },
    undefined
  );
  selectedAdminLevels.forEach((selectedAdminLevel) => {
    (clonedData[selectedAdminLevel] || []).forEach(({ id: regionId, values }) => {
      if (baselineValue && timeseriesIds.includes(regionId)) {
        values._baseline = baselineValue;
      }
    });
  });

  return clonedData;
};

export default function useRegionalDataFromBreakdownState(
  breakdownState: Ref<BreakdownState | null>,
  metadata: Ref<Model | Indicator | null>,
  outputSpecs: Ref<OutputSpecWithId[]>,
  selectedTimestamp: Ref<number | null>
) {
  // Fetch regional data for selected model and scenarios
  const regionalData = ref<RegionalAggregations | null>(null);

  watchEffect(async (onInvalidate) => {
    const _breakdownState = breakdownState.value;
    const _timestamp = selectedTimestamp.value;
    const _metadata = metadata.value;
    if (_timestamp === null || _breakdownState === null || _metadata === null) return;
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });

    if (isBreakdownStateYears(_breakdownState)) {
      // all output specs are sent to the getRegionAggregations where it will optimize
      // the number of calls made based on the context like breakdownOption sent with it.
      const selectedMonthInSelectedYears = _breakdownState.years.map((year) =>
        getTimestampMillis(parseInt(year), _timestamp).toString()
      );
      const { regionId, outputName, modelRunId } = _breakdownState;
      const allYears = await fetchAvailableYears(
        _metadata.data_id,
        regionId,
        outputName,
        modelRunId
      );
      const selectedMonthInAllYears = allYears.map((year) =>
        getTimestampMillis(parseInt(year), _timestamp).toString()
      );

      // get bulk results then parse them into a format usable for the formatting section afterwards
      const bulkResults = await getBulkRegionalData(
        outputSpecs.value[0],
        selectedMonthInSelectedYears,
        selectedMonthInAllYears,
        undefined // TODO: reference series
      );
      if (isCancelled) return;
      const results: RegionalAggregation[] = bulkResults.regional_data?.map((rd) => rd.data) ?? [];
      // TODO: reference series: "all years" and "selected years"
      // if (bulkResults.all_agg !== null) {
      //   results.push(bulkResults.all_agg);
      //   const newSpec = <OutputSpecWithId>{
      //     id: ReferenceSeriesOption.AllYears as string,
      //   };
      //   outputSpecs.push(newSpec);
      // }
      // if (bulkResults.select_agg) {
      //   results.push(bulkResults.select_agg);
      //   const newSpec = <OutputSpecWithId>{
      //     id: ReferenceSeriesOption.SelectYears as string,
      //   };
      //   outputSpecs.push(newSpec);
      // }
      regionalData.value = combineRegionAggregationList(
        results,
        outputSpecs.value.map((outputSpec) => outputSpec.id)
      );
    } else if (isBreakdownStateRegions(_breakdownState)) {
      // Only fetch regional data once for the whole world.
      const regionalAggregation = await getRegionAggregation(outputSpecs.value[0]);
      if (isCancelled) return;
      const regionalAggregations: RegionalAggregations = {
        country: [],
        admin1: [],
        admin2: [],
        admin3: [],
      };
      // Filter out any regions that aren't selected
      Object.values(AdminLevel).forEach((adminLevel) => {
        const regionAggsAtCurrentAdminLevel = regionalAggregation[adminLevel] || [];
        regionalAggregations[adminLevel] = regionAggsAtCurrentAdminLevel
          .filter((regionAgg) => _breakdownState.regionIds.includes(regionAgg.id))
          .map((regionAgg) => ({ id: regionAgg.id, values: { [regionAgg.id]: regionAgg.value } }));
      });
      regionalData.value = applySplitByRegion(
        regionalAggregations,
        outputSpecs.value,
        undefined, // TODO: relativeTo && relativeTo.value,
        undefined // TODO: referenceOptions && referenceOptions.value
      );
    } else if (isBreakdownStateQualifiers(_breakdownState)) {
      const results = await getRegionAggregationWithQualifiers(
        outputSpecs.value[0],
        _breakdownState.qualifier
      );
      if (isCancelled) return;
      // Filter results so that only values from selected qualifiers are retained
      Object.values(AdminLevel).forEach((adminLevel) => {
        const regionAggsAtCurrentAdminLevel = results[adminLevel] || [];
        results[adminLevel] = regionAggsAtCurrentAdminLevel.map((regionAgg) => {
          const newValues: { [key: string]: number } = {};
          Object.entries(regionAgg.values)
            .filter(([qualifierValue]) => _breakdownState.qualifierValues.includes(qualifierValue))
            .forEach(([qualifierValue, value]) => (newValues[qualifierValue] = value));
          return {
            id: regionAgg.id,
            values: newValues,
          };
        });
      });
      regionalData.value = results;
    } else {
      // breakdownState is Split by None or Split by Outputs
      const results = await Promise.all(outputSpecs.value.map(getRegionAggregation));
      if (isCancelled) return;
      regionalData.value = combineRegionAggregationList(
        results,
        outputSpecs.value.map((outputSpec) => outputSpec.id)
      );
    }
  });

  return {
    regionalData,
  };
}
