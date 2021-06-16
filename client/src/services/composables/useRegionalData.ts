import { Ref, ref } from '@vue/reactivity';
import { computed, watch, watchEffect } from '@vue/runtime-core';
import { Model } from '@/types/Datacube';
import { OutputSpecWithId, RegionalAggregations } from '@/types/Runoutput';
import { getRegionAggregations } from '../runoutput-service';
import { DatacubeGeography } from '@/types/Common';
import _ from 'lodash';
import { readonly } from 'vue';

const EMPTY_REGION_LIST: DatacubeGeography = {
  country: [],
  admin1: [],
  admin2: [],
  admin3: []
};

export default function useRegionalData(
  selectedModelId: Ref<string>,
  selectedScenarioIds: Ref<string[]>,
  selectedTimestamp: Ref<number | null>,
  selectedSpatialAggregation: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedTemporalResolution: Ref<string>,
  metadata: Ref<Model | null>
) {
  // Fetch regional data for selected model and scenarios
  const regionalData = ref<RegionalAggregations | null>(null);
  const outputSpecs = computed<OutputSpecWithId[]>(() => {
    const modelMetadata = metadata.value;
    const timestamp = selectedTimestamp.value;
    if (
      selectedModelId.value === null ||
      selectedScenarioIds.value.length === 0 ||
      timestamp === null ||
      modelMetadata === null
    ) {
      return [];
    }
    return selectedScenarioIds.value.map(selectedScenarioId => ({
      id: selectedScenarioId,
      modelId: selectedModelId.value,
      runId: selectedScenarioId,
      outputVariable: modelMetadata.outputs[0].name || '',
      timestamp,
      temporalResolution: selectedTemporalResolution.value || 'month',
      temporalAggregation: selectedTemporalAggregation.value || 'mean',
      spatialAggregation: selectedSpatialAggregation.value || 'mean'
    }));
  });
  watchEffect(async onInvalidate => {
    regionalData.value = null;
    if (outputSpecs.value.length === 0) return;
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });
    const result = await getRegionAggregations(outputSpecs.value);
    if (isCancelled) return;
    regionalData.value = result;
  });
  const deselectedRegionIds = ref<DatacubeGeography>(
    _.cloneDeep(EMPTY_REGION_LIST)
  );
  const resetSelection = () => {
    deselectedRegionIds.value = _.cloneDeep(EMPTY_REGION_LIST);
  };
  watch(selectedModelId, () => {
    // Reset the deselected region list when the selected model changes
    resetSelection();
  });
  const toggleIsRegionSelected = (
    adminLevel: keyof DatacubeGeography,
    regionId: string
  ) => {
    const currentlyDeselected = deselectedRegionIds.value[adminLevel];
    const isRegionSelected = !currentlyDeselected.includes(regionId);
    // If region is currently selected, add it to list of deselected regions.
    //  Otherwise, remove from the list of deselected regions.
    const updatedList = isRegionSelected
      ? [...currentlyDeselected, regionId]
      : currentlyDeselected.filter(item => item !== regionId);
    // Assign new object to deselectedRegionIds.value to trigger reactivity updates.
    deselectedRegionIds.value = Object.assign({}, deselectedRegionIds.value, {
      [adminLevel]: updatedList
    });
  };
  const setAllRegionsSelected = (isSelectingAll: boolean) => {
    if (isSelectingAll) {
      resetSelection();
      return;
    }
    deselectedRegionIds.value = {
      country: (regionalData.value?.country ?? []).map(entry => entry.id) ?? [],
      admin1: (regionalData.value?.admin1 ?? []).map(entry => entry.id) ?? [],
      admin2: (regionalData.value?.admin2 ?? []).map(entry => entry.id) ?? [],
      admin3: (regionalData.value?.admin3 ?? []).map(entry => entry.id) ?? []
    };
  };
  return {
    outputSpecs,
    regionalData,
    deselectedRegionIds: readonly(deselectedRegionIds),
    toggleIsRegionSelected,
    setAllRegionsSelected
  };
}
