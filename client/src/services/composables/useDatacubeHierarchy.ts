import { DatacubeGeography } from '@/types/Common';
import { Indicator, Model } from '@/types/Datacube';
import { AdminRegionSets } from '@/types/Datacubes';
import _ from 'lodash';
import { computed, ref, Ref, watch, watchEffect } from 'vue';
import { getRegionLists } from '../outputdata-service';
import {
  ADMIN_LEVEL_KEYS,
  REGION_ID_DELIMETER,
  stringifySelectedRegions,
} from '@/utils/admin-level-util';
import { SpatialAggregationLevel } from '@/types/Enums';
import { validateSelectedRegions } from '@/utils/drilldown-util';

export default function useDatacubeHierarchy(
  selectedScenarioIds: Ref<string[]>,
  metadata: Ref<Model | Indicator | null>,
  selectedAdminLevel: Ref<number>,
  breakdownOption: Ref<string | null>,
  activeFeature: Ref<string>
) {
  /**
   * Contains the lists of regions at each admin level across all timestamps
   * in the selected model run(s) / indicator. Each entry in the list is a
   * string of the form 'Ethiopia__Oromia__Oromia Sub-Region'
   */
  const datacubeHierarchy = ref<DatacubeGeography | null>(null);

  const isMultiSelectionAllowed = computed(
    () => breakdownOption.value === SpatialAggregationLevel.Region
  );

  watchEffect(async (onInvalidate) => {
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });
    const datacubeMetadata = metadata.value;
    const _modelRunIds = selectedScenarioIds.value;
    if (datacubeMetadata === null || _modelRunIds.length === 0) {
      return;
    }

    try {
      const regionLists = await getRegionLists(
        datacubeMetadata.data_id,
        _modelRunIds,
        activeFeature.value
      );
      if (isCancelled) return;
      datacubeHierarchy.value = regionLists;
      // TODO: If we still want to filter out 'None' regions we also need to do so in getRegionAggregations in runoutput-service.ts
      // datacubeHierarchy.value = {
      //   country: regionLists?.country?.filter(
      //     (regionId: string) => _.last(regionId.split(REGION_ID_DELIMETER)) !== 'None') as string[],
      //   admin1: regionLists?.admin1?.filter(
      //     (regionId: string) => _.last(regionId.split(REGION_ID_DELIMETER)) !== 'None') as string[],
      //   admin2: regionLists?.admin2?.filter(
      //     (regionId: string) => _.last(regionId.split(REGION_ID_DELIMETER)) !== 'None') as string[],
      //   admin3: regionLists?.admin3?.filter(
      //     (regionId: string) => _.last(regionId.split(REGION_ID_DELIMETER)) !== 'None') as string[]
      // };
    } catch {}
  });

  const selectedRegionIdsAtAllLevels = ref<AdminRegionSets>({
    country: new Set(),
    admin1: new Set(),
    admin2: new Set(),
    admin3: new Set(),
  });

  const selectedRegionsString = computed(() =>
    stringifySelectedRegions(selectedRegionIdsAtAllLevels.value, selectedAdminLevel.value)
  );

  // When a new hierarchy arrives validate the selected regions to ensure they exist in this datacube
  watch([datacubeHierarchy], () => {
    const { isInvalid, validRegions } = validateSelectedRegions(
      selectedRegionIdsAtAllLevels.value,
      datacubeHierarchy.value
    );
    if (isInvalid) {
      selectedRegionIdsAtAllLevels.value = validRegions;
    }
  });

  watchEffect(() => {
    // If multiselection is no longer allowed, truncate the list of selected
    //  regions to a maximum length of one
    if (isMultiSelectionAllowed.value === false) {
      const truncateSet = (set: Set<any>) => {
        const newSet = _.clone(set);
        Array.from(newSet.keys())
          .slice(1)
          .forEach((key) => newSet.delete(key));
        return newSet;
      };
      const { country, admin1, admin2, admin3 } = selectedRegionIdsAtAllLevels.value;
      selectedRegionIdsAtAllLevels.value = {
        country: truncateSet(country),
        admin1: truncateSet(admin1),
        admin2: truncateSet(admin2),
        admin3: truncateSet(admin3),
      };
    }
  });
  const toggleIsRegionSelected = (adminLevel: keyof AdminRegionSets, regionId: string) => {
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
    const updatedSelectedRegionIdsAtAllLevels = Object.assign(
      {},
      selectedRegionIdsAtAllLevels.value,
      {
        [adminLevel]: updatedList,
      }
    );
    // The new de/selection at the current adminLevel
    // may invalidate existing selections at subsequent admin levels
    // e.g., the case where a previous selection at admin1 (e.g., Tanzania_Arusha) conflicts
    //  with a more recent selection on the country level (e.g. Kenya)
    ADMIN_LEVEL_KEYS.forEach((adminKey, adminIndx) => {
      const previousAdminKey = adminIndx === 0 ? adminKey : ADMIN_LEVEL_KEYS[adminIndx - 1];
      if (adminKey !== 'admin4' && adminKey !== 'admin5') {
        // do we have an explicit selection (i.e., from selectedRegionIdsAtAllLevels) for the previous admin level?
        //  if yes, then use it check all subsequent existing selection, if any, for compatibility
        const selectedAtPrevLevel = updatedSelectedRegionIdsAtAllLevels[previousAdminKey];
        const selectedAtCurrLevel = updatedSelectedRegionIdsAtAllLevels[adminKey];
        // we do have a selection at the previous level, but is it valid?
        if (selectedAtPrevLevel.size > 0) {
          // note the case where a previous selection at admin1 conflicts
          //  with a more recent selection on the country level
          // e.g., consider a previous selecction of Tanzania_Arusha at admin1
          //  followed by a selection of Kenya at the country level
          const regionsArrAtPrevLevel = Array.from(selectedAtPrevLevel);
          const validRegionsAtCurrentLevel = Array.from(selectedAtCurrLevel).filter((region) =>
            regionsArrAtPrevLevel.some((r) => region.startsWith(r))
          );
          updatedSelectedRegionIdsAtAllLevels[adminKey] = new Set<string>(
            validRegionsAtCurrentLevel
          );
        }
      }
    });

    // Assign new object to selectedRegionIdsAtAllLevels.value to trigger reactivity updates.
    selectedRegionIdsAtAllLevels.value = updatedSelectedRegionIdsAtAllLevels;
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

  const referenceRegions = computed(() => {
    return new Set(
      selectedRegionIds.value
        .map((regionId) =>
          regionId.split(REGION_ID_DELIMETER).slice(0, -1).join(REGION_ID_DELIMETER)
        )
        .filter((regionId) => regionId !== '')
    );
  });

  return {
    datacubeHierarchy,
    selectedRegionIds,
    selectedRegionsString,
    selectedRegionIdsAtAllLevels,
    referenceRegions,
    toggleIsRegionSelected,
  };
}
