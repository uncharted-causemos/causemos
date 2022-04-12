
import { Ref } from 'vue';
import { DataSpaceDataState, ViewState } from '@/types/Insight';
import { AggregationOption, DatacubeViewMode, DataTransform, TemporalResolutionOption } from '@/types/Enums';
import { BASE_LAYER, DATA_LAYER, DATA_LAYER_TRANSPARENCY } from './map-util-new';
import { COLOR, ColorScaleType } from '@/utils/colors-util';
import { OutputVariableSpecs } from '@/types/Outputdata';
import { AdminRegionSets } from '@/types/Datacubes';
import { DatacubeGeography } from '@/types/Common';
import _ from 'lodash';
import { ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';

export const toStateSelectedRegionsAtAllLevels = (data: AdminRegionSets) => {
  return {
    country: Array.from(data.country),
    admin1: Array.from(data.admin1),
    admin2: Array.from(data.admin2),
    admin3: Array.from(data.admin3)
  };
};

export const fromStateSelectedRegionsAtAllLevels = (data: { country: string[], admin1: string[], admin2: string[], admin3: string[] }) => {
  // If country isn't valid array. This can happen if invalid state was saved to the server before.
  if (data.country.length === undefined) {
    return {
      country: new Set<string>(),
      admin1: new Set<string>(),
      admin2: new Set<string>(),
      admin3: new Set<string>()
    };
  }
  return {
    country: new Set(data.country),
    admin1: new Set(data.admin1),
    admin2: new Set(data.admin2),
    admin3: new Set(data.admin3)
  };
};

export const validateSelectedRegions = (selectedRegions: AdminRegionSets, hierarchy: DatacubeGeography | null) => {
  let isInvalid = false;
  const validRegions = _.cloneDeep(selectedRegions);
  ADMIN_LEVEL_KEYS.forEach(adminKey => {
    if (hierarchy && adminKey !== 'admin4' && adminKey !== 'admin5') { // why are these even here?
      const selected = [...selectedRegions[adminKey]];
      const validList = _.intersection(hierarchy[adminKey], selected);
      if (selected.length !== validList.length) {
        isInvalid = true;
        validRegions[adminKey] = new Set(validList);
      }
    }
  });
  return { isInvalid, validRegions };
};

export const aggregationOptionFiltered = Object.values(AggregationOption).filter(ao => AggregationOption.None as string !== ao);
export const temporalResolutionOptionFiltered = Object.values(TemporalResolutionOption).filter(tro => TemporalResolutionOption.None as string !== tro);

export function initDataStateFromRefs (
  relativeTo: Ref<string|null>,
  selectedModelId: Ref<any>,
  nonDefaultQualifiers: Ref<Set<string>>,
  selectedQualifierValues: Ref<Set<string>>,
  selectedRegionIds: Ref<string[]>,
  selectedRegionIdsAtAllLevels: Ref<AdminRegionSets>,
  selectedOutputVariables: Ref<Set<string>>,
  activeFeatures: Ref<OutputVariableSpecs[]>,
  selectedScenarioIds: Ref<string[]>,
  selectedTimestamp: Ref<number|null>,
  selectedYears: Ref<Set<string>>,
  selectedTransform: Ref<DataTransform>,
  activeReferenceOptions: Ref<string[]>,
  searchFilters: Ref<any>,
  selectedPreGenDataId: Ref<string>
): DataSpaceDataState {
  return {
    selectedModelId: selectedModelId.value,
    selectedScenarioIds: selectedScenarioIds.value,
    selectedTimestamp: selectedTimestamp.value,
    selectedRegionIds: selectedRegionIds.value,
    selectedRegionIdsAtAllLevels: toStateSelectedRegionsAtAllLevels(selectedRegionIdsAtAllLevels.value),
    selectedOutputVariables: Array.from(selectedOutputVariables.value),
    activeFeatures: activeFeatures.value,
    relativeTo: relativeTo.value,
    nonDefaultQualifiers: [...nonDefaultQualifiers.value],
    selectedQualifierValues: [...selectedQualifierValues.value],
    selectedYears: [...selectedYears.value],
    selectedTransform: selectedTransform.value,
    activeReferenceOptions: activeReferenceOptions.value,
    searchFilters: searchFilters.value,
    selectedPreGenDataId: selectedPreGenDataId.value ?? ''
  };
}

export function initViewStateFromRefs (
  breakdownOption: Ref<string|null>,
  currentOutputIndex: Ref<number>,
  currentTabView: Ref<DatacubeViewMode>,
  selectedAdminLevel: Ref<number>,
  selectedBaseLayer: Ref<BASE_LAYER>,
  selectedDataLayer: Ref<DATA_LAYER>,
  selectedSpatialAggregation: Ref<AggregationOption>,
  selectedTemporalAggregation: Ref<AggregationOption>,
  selectedTemporalResolution: Ref<TemporalResolutionOption>,
  dataLayerTransparency: Ref<DATA_LAYER_TRANSPARENCY>,
  colorSchemeReversed: Ref<boolean>,
  colorSchemeName: Ref<COLOR>,
  colorScaleType: Ref<ColorScaleType>,
  numberOfColorBins: Ref<number>
): ViewState {
  return {
    spatialAggregation: selectedSpatialAggregation.value,
    temporalAggregation: selectedTemporalAggregation.value,
    temporalResolution: selectedTemporalResolution.value,
    selectedViewTab: currentTabView.value,
    selectedOutputIndex: currentOutputIndex.value,
    selectedMapBaseLayer: selectedBaseLayer.value,
    selectedMapDataLayer: selectedDataLayer.value,
    breakdownOption: breakdownOption.value,
    selectedAdminLevel: selectedAdminLevel.value,
    dataLayerTransparency: dataLayerTransparency.value,
    colorSchemeReversed: colorSchemeReversed.value,
    colorSchemeName: colorSchemeName.value,
    colorScaleType: colorScaleType.value,
    numberOfColorBins: numberOfColorBins.value
  };
}
