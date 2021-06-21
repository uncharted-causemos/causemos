import _ from 'lodash';
import { Ref, ref } from '@vue/reactivity';
import { computed, watch, watchEffect } from '@vue/runtime-core';
import { Indicator, Model } from '@/types/Datacube';
import { OutputSpecWithId, RegionalAggregations } from '@/types/Runoutput';
import { getRegionAggregations } from '../runoutput-service';
import { readonly } from 'vue';
import { useStore } from 'vuex';
import { AdminRegionSets } from '@/types/Datacubes';

const EMPTY_ADMIN_REGION_SETS: AdminRegionSets = {
  country: new Set(),
  admin1: new Set(),
  admin2: new Set(),
  admin3: new Set()
};
export default function useRegionalData(
  selectedModelId: Ref<string>,
  selectedScenarioIds: Ref<string[]>,
  selectedTimestamp: Ref<number | null>,
  selectedSpatialAggregation: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedTemporalResolution: Ref<string>,
  metadata: Ref<Model | Indicator | null>
) {
  const store = useStore();
  const currentOutputIndex = computed(
    () => store.getters['modelPublishStore/currentOutputIndex']
  );

  // Fetch regional data for selected model and scenarios
  const regionalData = ref<RegionalAggregations | null>(null);
  const outputSpecs = computed<OutputSpecWithId[]>(() => {
    const modelMetadata = metadata.value;
    const timestamp = selectedTimestamp.value;
    if (
      selectedModelId.value === null ||
      selectedScenarioIds.value.length === 0 ||
      timestamp === null ||
      modelMetadata === null ||
      currentOutputIndex.value === undefined
    ) {
      return [];
    }
    const outputs = modelMetadata.validatedOutputs
      ? modelMetadata.validatedOutputs
      : modelMetadata.outputs;
    return selectedScenarioIds.value.map(selectedScenarioId => ({
      id: selectedScenarioId,
      modelId: selectedModelId.value,
      runId: selectedScenarioId,
      outputVariable: outputs[currentOutputIndex.value].name || '',
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
  const deselectedRegionIds = ref<AdminRegionSets>(
    _.cloneDeep(EMPTY_ADMIN_REGION_SETS)
  );
  const resetSelection = () => {
    deselectedRegionIds.value = _.cloneDeep(EMPTY_ADMIN_REGION_SETS);
  };
  watch(selectedModelId, () => {
    // Reset the deselected region list when the selected model changes
    resetSelection();
  });
  const toggleIsRegionSelected = (
    adminLevel: keyof AdminRegionSets,
    regionId: string
  ) => {
    const currentlyDeselected = deselectedRegionIds.value[adminLevel];
    const isRegionSelected = !currentlyDeselected.has(regionId);
    // If region is currently selected, add it to list of deselected regions.
    //  Otherwise, remove from the list of deselected regions.
    const updatedList = _.clone(currentlyDeselected);
    if (isRegionSelected) {
      updatedList.add(regionId);
    } else {
      updatedList.delete(regionId);
    }
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
      country: new Set(
        (regionalData.value?.country ?? []).map(entry => entry.id) ?? []
      ),
      admin1: new Set(
        (regionalData.value?.admin1 ?? []).map(entry => entry.id) ?? []
      ),
      admin2: new Set(
        (regionalData.value?.admin2 ?? []).map(entry => entry.id) ?? []
      ),
      admin3: new Set(
        (regionalData.value?.admin3 ?? []).map(entry => entry.id) ?? []
      )
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
