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
  const allRegions = ref<DatacubeGeography>({
    country: [],
    admin1: [],
    admin2: [],
    admin3: []
  });
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
    // FIXME: this should run once for the whole model,
    //  rather than arbitrarily for the first scenario
    // Note that this will only be an issue when we're using these hierarchy
    //  results to populate the breakdown pane, since currently we're only
    //  using them when split by region is active (exactly one run is selected)
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
      // FIXME: would be nice if hierarchy endpoint returned this already in the DatacubeGeography format
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
      allRegions.value = newValue;
    } catch {}
  });

  return {
    allRegions
  };
}
