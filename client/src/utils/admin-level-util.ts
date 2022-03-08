import { AdminRegionSets, BreakdownData } from '@/types/Datacubes';
import { AdminLevel, DatacubeGeoAttributeVariableType } from '@/types/Enums';
import { RegionalAggregations } from '@/types/Outputdata';
import _ from 'lodash';

export const ADMIN_LEVEL_TITLES: { [key in AdminLevel]: string } = {
  country: 'Country',
  admin1: 'L1 admin region',
  admin2: 'L2 admin region',
  admin3: 'L3 admin region',
  admin4: 'L4 admin region',
  admin5: 'L5 admin region'
};

// Ordered list of the admin region levels
export const ADMIN_LEVEL_KEYS = Object.values(AdminLevel);

export const REGION_ID_DELIMETER = '__'; // Used to construct full GADM path as the shape file vector source for map rendering
export const REGION_ID_DISPLAY_DELIMETER = ', '; // Used for nicer display of GADM name/path in the UI

// Pull out the regions at the current level that are selected, or which have an ancestor that's selected.
export function filterRegionalLevelData(regionalData: BreakdownData | RegionalAggregations, selectedRegionIdsAtAllLevels: AdminRegionSets | null, applyFilteringToCountryLevel: boolean) {
  const filteredRegionLevelData = _.cloneDeep(regionalData);

  ADMIN_LEVEL_KEYS.forEach((adminKey, adminIndx) => {
    if (filteredRegionLevelData[adminKey]) {
      const filteredDataAtCurrentLevel: any = [];
      const previousAdminLevelKey = adminIndx === 0 ? adminKey : ADMIN_LEVEL_KEYS[adminIndx - 1];
      // should we filter data at all levels starting from "Country" or the "Admin1" level
      //  i.e., in datacube-drilldown, breakdown data should not filter regional data at the country level
      //        while data at the country level should be filtered within the region-ranking view
      if ((applyFilteringToCountryLevel || adminIndx > 0) && previousAdminLevelKey !== 'admin4' && previousAdminLevelKey !== 'admin5' && adminKey !== 'admin4' && adminKey !== 'admin5') {
        // do we have an explicit selection (i.e., from selectedRegionIdsAtAllLevels) for the previous admin level?
        //  if yes, then use it to filter
        //  if no, then consider the (filtered) data already at the previous level
        let selectedRegionsAtPrevLevel: string[] = selectedRegionIdsAtAllLevels !== null ? Array.from(selectedRegionIdsAtAllLevels[previousAdminLevelKey]) : filteredRegionLevelData[previousAdminLevelKey]?.map(regionItem => regionItem.id) as string [];
        const selectedRegionsAtCurrLevel: string[] = selectedRegionIdsAtAllLevels !== null ? Array.from(selectedRegionIdsAtAllLevels[adminKey]) : [];

        // if no selection was found at the previous level
        //  then consider the (filtered) data already at the previous level
        if (selectedRegionsAtPrevLevel.length === 0) {
          selectedRegionsAtPrevLevel = filteredRegionLevelData[previousAdminLevelKey]?.map(regionItem => regionItem.id) as string[];
        }
        // we now have either all the regions of the previous level
        //  or a subet of them in case there was a valid selection
        //
        // use the selectedRegionsAtPrevLevel to filter the current level
        selectedRegionsAtPrevLevel.forEach(regionAtPrevLevel => {
          const temp = filteredRegionLevelData[adminKey]?.filter(regionItem => regionItem.id.startsWith(regionAtPrevLevel));
          if (temp !== undefined) {
            const filterCurrLevel = temp.filter(region => selectedRegionsAtCurrLevel.length > 0 ? selectedRegionsAtCurrLevel.includes(region.id) : true);
            filteredDataAtCurrentLevel.push(...(applyFilteringToCountryLevel ? filterCurrLevel : temp));
          }
        });
        filteredRegionLevelData[adminKey] = filteredDataAtCurrentLevel;
      }
    }
  });

  return filteredRegionLevelData;
}

// Get the string representation of the selected region Ids of the current or above level
export function getSelectedRegionIdsDisplay(selection: AdminRegionSets, curAdminLevel: number) {
  const selections = [selection.country, selection.admin1, selection.admin2, selection.admin3].slice(0, curAdminLevel + 1);
  let result = '';
  for (const s of selections.reverse()) {
    const regions = Array.from(s);
    result += regions.join('/');
    if (result !== '') break;
  }
  if (result === '') {
    result = 'All';
  }
  return result;
}

// Get either selected regions at given level or from the parent levels if no selection found in current level.
export function getParentSelectedRegions(selection: AdminRegionSets, adminLevel: number) {
  const { country, admin1, admin2, admin3 } = selection;
  // Selection from the smallest available admin level
  const regionSelection =
    [country, admin1, admin2, admin3]
      .slice(0, adminLevel + 1) // only consider levels above the current level
      .filter(set => set.size > 0) // filter out admin levels with no selection
      .map(set => Array.from(set)) // convert the set to array
      .pop(); // get the last item (selection from the smallest available admin level)
  return regionSelection || [];
}

export function stringToAdminLevel(geoString: string) {
  const adminLevel = geoString === DatacubeGeoAttributeVariableType.Country ? 0 : +(geoString[geoString.length - 1]);
  return adminLevel;
}

export function adminLevelToString(level: number) {
  const adminLevel = level === 0 ? 'country' : 'admin' + level;
  return adminLevel as AdminLevel;
}

export function getLevelFromRegionId(regionId: string) {
  const level = regionId.split(REGION_ID_DELIMETER).length;
  return level;
}
