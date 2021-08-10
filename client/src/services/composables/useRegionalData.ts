import { Ref, ref } from '@vue/reactivity';
import { watchEffect } from '@vue/runtime-core';
import { OutputSpecWithId, RegionalAggregations } from '@/types/Runoutput';
import { getRegionAggregations } from '../runoutput-service';
import { DatacubeGeography } from '@/types/Common';

export default function useRegionalData(
  outputSpecs: Ref<OutputSpecWithId[]>,
  datacubeHierarchy: Ref<DatacubeGeography | null>
) {
  // Fetch regional data for selected model and scenarios
  const regionalData = ref<RegionalAggregations | null>(null);
  watchEffect(async onInvalidate => {
    // FIXME: OPTIMIZATION: if we're careful, we can rearrange things so that the
    //  getRegionAggregations call doesn't have to wait until the datacubeHierarchy is ready
    if (outputSpecs.value.length === 0 || datacubeHierarchy.value === null) return;
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });
    const result = await getRegionAggregations(
      outputSpecs.value,
      datacubeHierarchy.value
    );
    if (isCancelled) return;
    regionalData.value = result;
  });

  return {
    outputSpecs,
    regionalData
  };
}
