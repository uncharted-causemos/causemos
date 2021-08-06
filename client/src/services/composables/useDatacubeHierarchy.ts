import { DatacubeGeography } from '@/types/Common';
import { Indicator, Model } from '@/types/Datacube';
import { computed, ref, Ref, watchEffect } from 'vue';
import { useStore } from 'vuex';
import { getHierarchy } from '../new-datacube-service';

interface HierarchyNode {
  [key: string]: null | HierarchyNode;
}

const flattenRegions = (node: HierarchyNode | null) => {
  const regions: string[] = [];
  if (node === null) return [];
  Object.entries(node).forEach(([key, node]) => {
    regions.push(key, ...flattenRegions(node));
  });
  return regions;
};

export default function useDatacubeHierarchy(
  selectedScenarioIds: Ref<string[]>,
  metadata: Ref<Model | Indicator | null>
) {
  /**
   * Contains the lists of regions at each admin level across all timestamps
   * in the selected model run(s) / indicator. Each entry in the list is a
   * string of the form 'Ethiopia__Oromia__Oromia Sub-Region'
   */
  const datacubeHierarchy = ref<DatacubeGeography | null>(null);
  const store = useStore();
  const datacubeCurrentOutputsMap = computed(
    () => store.getters['app/datacubeCurrentOutputsMap']
  );

  watchEffect(async onInvalidate => {
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });
    const datacubeMetadata = metadata.value;
    const _modelRunIds = selectedScenarioIds.value;
    if (datacubeMetadata === null || _modelRunIds.length === 0) {
      return;
    }
    // FIXME: Some planned improvements to this endpoint:
    //  - pass a list of run IDs to fetch the combined hierarchy at once
    //  - return hierarchy in DatacubeGeography format (will require a new 'region-list' endpoint)
    // Ben, August 2021
    const runId = _modelRunIds[0];

    let activeFeature = '';
    const currentOutputEntry =
      datacubeCurrentOutputsMap.value[datacubeMetadata.id];
    if (currentOutputEntry !== undefined) {
      const outputs = datacubeMetadata.validatedOutputs
        ? datacubeMetadata.validatedOutputs
        : datacubeMetadata.outputs;
      activeFeature = outputs[currentOutputEntry].name;
    } else {
      activeFeature = datacubeMetadata.default_feature ?? '';
    }
    try {
      const hierarchy = await getHierarchy(
        datacubeMetadata.data_id,
        runId,
        activeFeature
      );
      if (isCancelled) return;
      const newValue = {
        country: [] as string[],
        admin1: [] as string[],
        admin2: [] as string[],
        admin3: [] as string[]
      };
      const regions = flattenRegions(hierarchy);
      regions.forEach(regionId => {
        const path = regionId.split('__');
        if (path[path.length - 1] === 'None') return;
        if (path.length === 1) {
          newValue.country.push(regionId);
        } else if (path.length === 2) {
          newValue.admin1.push(regionId);
        } else if (path.length === 3) {
          newValue.admin2.push(regionId);
        } else if (path.length === 4) {
          newValue.admin3.push(regionId);
        }
      });
      datacubeHierarchy.value = newValue;
    } catch {}
  });

  return {
    datacubeHierarchy
  };
}
