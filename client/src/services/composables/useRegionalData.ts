import { Ref, ref } from '@vue/reactivity';
import { computed, watchEffect } from '@vue/runtime-core';
import { Indicator, Model } from '@/types/Datacube';
import { OutputSpecWithId, RegionalAggregations } from '@/types/Runoutput';
import { getRegionAggregations } from '../runoutput-service';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import { SpatialAggregationLevel } from '@/types/Enums';
import { useStore } from 'vuex';
import { DatacubeGeography } from '@/types/Common';
import { ADMIN_LEVEL_KEYS, REGION_ID_DELIMETER } from '@/utils/admin-level-util';
import _ from 'lodash';

const applySplitByRegion = (
  regionalData: RegionalAggregations,
  specs: OutputSpecWithId[]
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
  //  timeseries ID (eventually this will be used to color it), and assign
  //  the other values to an arbitrary 'unselected region' ID.
  clonedData[selectedAdminLevel] = valuesAtSelectedLevel.map(
    ({ id: regionId, values }) => {
      const filteredValues = {} as any;
      // ASSUMPTION: this processing step only occurs when a single outputSpec
      //  was fed into getRegionAggregations, so there is at most one key-value
      //  pair in `values`
      Object.values(values).forEach(value => {
        if (timeseriesIds.includes(regionId)) {
          filteredValues[regionId] = value;
        } else {
          filteredValues['unselected region'] = value;
        }
      });
      return {
        id: regionId,
        values: filteredValues
      };
    }
  );
  return clonedData;
};

export default function useRegionalData(
  selectedModelId: Ref<string>,
  selectedSpatialAggregation: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedTemporalResolution: Ref<string>,
  metadata: Ref<Model | Indicator | null>,
  selectedTimeseriesPoints: Ref<TimeseriesPointSelection[]>,
  breakdownOption: Ref<string | null>,
  datacubeHierarchy: Ref<DatacubeGeography | null>
) {
  const store = useStore();
  const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);

  // Fetch regional data for selected model and scenarios
  const regionalData = ref<RegionalAggregations | null>(null);
  const outputSpecs = computed<OutputSpecWithId[]>(() => {
    const modelMetadata = metadata.value;
    if (
      selectedModelId.value === null ||
      modelMetadata === null
    ) {
      return [];
    }

    let activeFeature = '';
    const currentOutputEntry = datacubeCurrentOutputsMap.value[modelMetadata.id];
    if (currentOutputEntry !== undefined) {
      const outputs = modelMetadata.validatedOutputs ? modelMetadata.validatedOutputs : modelMetadata.outputs;
      activeFeature = outputs[currentOutputEntry].name;
    } else {
      activeFeature = modelMetadata.default_feature ?? '';
    }

    const activeModelId = modelMetadata.data_id ?? '';

    return selectedTimeseriesPoints.value.map(({ timeseriesId, scenarioId, timestamp }) => ({
      id: timeseriesId,
      modelId: activeModelId,
      runId: scenarioId,
      outputVariable: activeFeature,
      timestamp,
      temporalResolution: selectedTemporalResolution.value,
      temporalAggregation: selectedTemporalAggregation.value,
      spatialAggregation: selectedSpatialAggregation.value
    }));
  });
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
      ? applySplitByRegion(result, outputSpecs.value)
      : result;
  });

  return {
    outputSpecs,
    regionalData
  };
}
