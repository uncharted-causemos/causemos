import _ from 'lodash';
import { Ref, ref } from '@vue/reactivity';
import { watchEffect } from '@vue/runtime-core';
import { SpatialAggregationLevel, TemporalAggregationLevel } from '@/types/Enums';
import { OutputSpecWithId, RegionalAggregations } from '@/types/Outputdata';
import { getRegionAggregations } from '../services/outputdata-service';
import { DatacubeGeography } from '@/types/Common';
import { ADMIN_LEVEL_KEYS, REGION_ID_DELIMETER } from '@/utils/admin-level-util';
import { BreakdownData } from '@/types/Datacubes';
import { getTimestampMillis } from '@/utils/date-util';
import { BASELINE_VALUE_PROPERTY } from '@/utils/map-util-new';

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
  if (!relativeTo) return clonedData;
  // Find baseline value
  const baselineValue = selectedAdminLevels.reduce(
    (baseVal: number | undefined, selectedAdminLevel) => {
      const relativeData = clonedData[selectedAdminLevel]?.find(({ id }) => {
        return id === relativeTo;
      });
      if (relativeData && timeseriesIds.includes(relativeData.id)) {
        baseVal = relativeData.values[relativeData.id];
      }
      return baseVal;
    },
    undefined
  );

  // BASELINE_VALUE_PROPERTY property is special private property to store the baseline value
  selectedAdminLevels.forEach((selectedAdminLevel) => {
    (clonedData[selectedAdminLevel] || []).forEach(({ id: regionId, values }) => {
      if (baselineValue && timeseriesIds.includes(regionId)) {
        values[BASELINE_VALUE_PROPERTY] = baselineValue;
      }
    });
  });

  return clonedData;
};

export default function useRegionalData(
  outputSpecs: Ref<OutputSpecWithId[]>,
  breakdownOption: Ref<string | null>,
  datacubeHierarchy: Ref<DatacubeGeography | null>,
  relativeTo?: Ref<string | null>,
  referenceOptions?: Ref<string[]>,
  temporalBreakdownData?: Ref<BreakdownData | null>,
  timestampForSelection?: Ref<number | null>
) {
  // Fetch regional data for selected model and scenarios
  const regionalData = ref<RegionalAggregations | null>(null);

  watchEffect(async (onInvalidate) => {
    // FIXME: OPTIMIZATION: with some careful refactoring, we can adjust things
    //  so that the getRegionAggregations call doesn't have to wait until the
    //  datacubeHierarchy is ready
    if (datacubeHierarchy.value === null) return;
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });

    let allYearlyTimestampsForSelection: string[] = [];

    if (
      breakdownOption.value === TemporalAggregationLevel.Year &&
      typeof timestampForSelection?.value === 'number' &&
      temporalBreakdownData?.value
    ) {
      const years = temporalBreakdownData.value.Year.map((tbd) => parseInt(tbd.id));
      allYearlyTimestampsForSelection = years.map((year) =>
        getTimestampMillis(year, timestampForSelection.value as number).toString()
      );
    }

    // all output specs are sent to the getRegionAggregations where it will optimize
    // the number of calls made based on the context like breakdownOption sent with it.
    const result = await getRegionAggregations(
      outputSpecs.value,
      datacubeHierarchy.value,
      breakdownOption.value as string,
      referenceOptions?.value,
      allYearlyTimestampsForSelection
    );
    if (isCancelled) return;

    regionalData.value =
      breakdownOption.value === SpatialAggregationLevel.Region
        ? applySplitByRegion(
            result,
            outputSpecs.value,
            relativeTo && relativeTo.value,
            referenceOptions && referenceOptions.value
          )
        : result;
  });

  return {
    regionalData,
  };
}
