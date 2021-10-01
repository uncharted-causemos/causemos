
import _ from 'lodash';
import { Ref, ref } from '@vue/reactivity';
import { watchEffect } from '@vue/runtime-core';
import { SpatialAggregationLevel } from '@/types/Enums';
import { OutputSpecWithId, RegionalAggregations } from '@/types/Runoutput';
import { getRegionAggregations } from '../runoutput-service';
import { DatacubeGeography } from '@/types/Common';
import { ADMIN_LEVEL_KEYS, REGION_ID_DELIMETER } from '@/utils/admin-level-util';

const applySplitByRegion = (
  regionalData: RegionalAggregations,
  specs: OutputSpecWithId[],
  relativeTo?: string | null
) => {
  if (specs.length === 0) return regionalData;
  const ancestorCount = specs[0].id.split(REGION_ID_DELIMETER).length - 1;
  const selectedAdminLevel = ADMIN_LEVEL_KEYS[ancestorCount];
  const clonedData = _.cloneDeep(regionalData);
  const valuesAtSelectedLevel = clonedData[selectedAdminLevel];
  if (valuesAtSelectedLevel === undefined) return regionalData;
  // Since "split by region" is active, each output spec's ID is the ID of a
  //  timeseries, and there is one timeseries for each selected region.
  const timeseriesIds = specs.map(spec => spec.id);
  // Assign the value for each selected region to the the corresponding
  //  timeseries ID (eventually this will be used to color it)
  clonedData[selectedAdminLevel] = valuesAtSelectedLevel.map(
    ({ id: regionId, values }) => {
      const filteredValues = {} as any;
      // ASSUMPTION: this processing step only occurs when a single outputSpec
      //  was fed into getRegionAggregations, so there is at most one key-value
      //  pair in `values`
      Object.values(values).forEach(value => {
        if (timeseriesIds.includes(regionId)) {
          filteredValues[regionId] = value;
        }
      });
      return {
        id: regionId,
        values: filteredValues
      };
    }
  );
  // When relativeTo mode is on, add baseline value to each region
  // '_baseline' property is special private property to store the baseline value
  if (!relativeTo) return clonedData;
  // Find baseline value
  const baselineValue = valuesAtSelectedLevel.find(({ id }) => {
    return id === relativeTo;
  })?.values[specs[0].id];

  (clonedData[selectedAdminLevel] || []).forEach(
    ({ id: regionId, values }) => {
      if (baselineValue && timeseriesIds.includes(regionId)) {
        values._baseline = baselineValue;
      }
    }
  );
  return clonedData;
};

export default function useRegionalData(
  outputSpecs: Ref<OutputSpecWithId[]>,
  breakdownOption: Ref<string | null>,
  datacubeHierarchy: Ref<DatacubeGeography | null>,
  relativeTo?: Ref<string | null>
) {
  // Fetch regional data for selected model and scenarios
  const regionalData = ref<RegionalAggregations | null>(null);
  watchEffect(async onInvalidate => {
    // FIXME: OPTIMIZATION: with some careful refactoring, we can adjust things
    //  so that the getRegionAggregations call doesn't have to wait until the
    //  datacubeHierarchy is ready
    if (datacubeHierarchy.value === null) return;
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });
    // If split by region is active, only one fetch is needed to get the data
    //  for all regions
    const _outputSpecs = breakdownOption.value === SpatialAggregationLevel.Region
      ? outputSpecs.value.slice(0, 1)
      : outputSpecs.value;
    const result = await getRegionAggregations(
      _outputSpecs,
      datacubeHierarchy.value
    );
    if (isCancelled) return;

    regionalData.value = breakdownOption.value === SpatialAggregationLevel.Region
      ? applySplitByRegion(result, outputSpecs.value, (relativeTo && relativeTo.value))
      : result;
  });

  return {
    outputSpecs,
    regionalData
  };
}
