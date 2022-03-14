
import { Ref } from 'vue';
import { DatacubeFeature, Indicator, Model } from '@/types/Datacube';
import { DataState, ViewState } from '@/types/Insight';
import { AggregationOption, DataTransform, TemporalResolutionOption } from '@/types/Enums';
import { BASE_LAYER, DATA_LAYER, DATA_LAYER_TRANSPARENCY } from './map-util-new';
import { Timeseries } from '@/types/Timeseries';
import { COLOR, ColorScaleType } from '@/utils/colors-util';
import { OutputVariableSpecs } from '@/types/Outputdata';
import { AdminRegionSets } from '@/types/Datacubes';

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

export const aggregationOptionFiltered = Object.values(AggregationOption).filter(ao => AggregationOption.None as string !== ao);
export const temporalResolutionOptionFiltered = Object.values(TemporalResolutionOption).filter(tro => TemporalResolutionOption.None as string !== tro);

export function initDataStateFromRefs (
  mainModelOutput: Ref<DatacubeFeature|undefined>,
  metadata: Ref<Model|Indicator|null>,
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
  visibleTimeseriesData?: Ref<Timeseries[]> // useful for the node view's validation, but ignoreable by everything else, so optional
): DataState {
  return {
    selectedModelId: selectedModelId.value,
    selectedScenarioIds: selectedScenarioIds.value,
    selectedTimestamp: selectedTimestamp.value,
    datacubeTitles: [{
      datacubeName: metadata.value?.name ?? '',
      datacubeOutputName: mainModelOutput?.value?.display_name ?? '',
      source: metadata.value?.maintainer.organization ?? ''
    }],
    datacubeRegions: metadata.value?.geography.country, // FIXME: later this could be the selected region for each datacube
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
    visibleTimeseriesData: visibleTimeseriesData?.value,
    searchFilters: searchFilters.value
  };
}

export function initViewStateFromRefs (
  breakdownOption: Ref<string|null>,
  currentOutputIndex: Ref<number>,
  currentTabView: Ref<string>,
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
    isDescriptionView: currentTabView.value === 'description', // FIXME
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
