import { DatacubeGeography } from '@/types/Common';
import { Indicator, Model } from '@/types/Datacube';
import { AdminRegionSets } from '@/types/Datacubes';
import _ from 'lodash';
import { computed, ref, Ref, watch, watchEffect } from 'vue';
import { useStore } from 'vuex';
import { getHierarchy } from '../new-datacube-service';
import { ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';
import { SpatialAggregationLevel } from '@/types/Enums';

const EMPTY_ADMIN_REGION_SETS: AdminRegionSets = {
  country: new Set(),
  admin1: new Set(),
  admin2: new Set(),
  admin3: new Set()
};

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
  metadata: Ref<Model | Indicator | null>,
  selectedAdminLevel: Ref<number>,
  breakdownOption: Ref<string | null>
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

  const isMultiSelectionAllowed = computed(
    () => breakdownOption.value === SpatialAggregationLevel.Region
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

  const selectedRegionIdsAtAllLevels = ref<AdminRegionSets>(
    _.clone(EMPTY_ADMIN_REGION_SETS)
  );
  const resetSelection = () => {
    selectedRegionIdsAtAllLevels.value = _.clone(EMPTY_ADMIN_REGION_SETS);
  };
  watch([datacubeHierarchy], () => {
    // Reset the selected region list when the list of all regions changes
    resetSelection();
  });
  watchEffect(() => {
    // If multiselection is no longer allowed, truncate the list of selected
    //  regions to a maximum length of one
    if (isMultiSelectionAllowed.value === false) {
      const truncateSet = (set: Set<any>) => {
        const newSet = _.clone(set);
        Array.from(newSet.keys())
          .slice(1)
          .forEach(key => newSet.delete(key));
        return newSet;
      };
      const { country, admin1, admin2, admin3 } = selectedRegionIdsAtAllLevels.value;
      selectedRegionIdsAtAllLevels.value = {
        country: truncateSet(country),
        admin1: truncateSet(admin1),
        admin2: truncateSet(admin2),
        admin3: truncateSet(admin3)
      };
    }
  });
  const toggleIsRegionSelected = (
    adminLevel: keyof AdminRegionSets,
    regionId: string
  ) => {
    const currentlySelected = selectedRegionIdsAtAllLevels.value[adminLevel];
    const isRegionSelected = currentlySelected.has(regionId);
    const updatedList = _.clone(currentlySelected);
    if (isRegionSelected) {
      // If region is currently selected, remove it from the list of selected regions.
      updatedList.delete(regionId);
    } else if (isMultiSelectionAllowed.value) {
      // Else if multiple regions can be selected add it to the list of selected regions.
      updatedList.add(regionId);
    } else {
      // Otherwise, replace the list of selected regions with this region.
      updatedList.clear();
      updatedList.add(regionId);
    }
    // Assign new object to selectedRegionIdsAtAllLevels.value to trigger reactivity updates.
    selectedRegionIdsAtAllLevels.value = Object.assign(
      {},
      selectedRegionIdsAtAllLevels.value,
      {
        [adminLevel]: updatedList
      }
    );
  };

  const selectedRegionIds = computed(() => {
    const selectedAdminLevelKey = ADMIN_LEVEL_KEYS[selectedAdminLevel.value];
    if (
      datacubeHierarchy.value === null ||
      selectedAdminLevelKey === 'admin4' ||
      selectedAdminLevelKey === 'admin5'
    ) {
      return [];
    }
    const selectedRegionsAtSelectedLevel = Array.from(
      selectedRegionIdsAtAllLevels.value[selectedAdminLevelKey]
    );
    return selectedRegionsAtSelectedLevel.slice(0, 10); // FIXME: Quick guard to make sure we don't blow up
  });

  return {
    datacubeHierarchy,
    selectedRegionIds,
    toggleIsRegionSelected
  };
}
