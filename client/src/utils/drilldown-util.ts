
import { ComputedRef, Ref } from 'vue';
import { DatacubeFeature, Indicator, Model } from '@/types/Datacube';
import { DataState, ViewState } from '@/types/Insight';
import { AggregationOption, DataTransform, TemporalResolutionOption } from '@/types/Enums';
import { BASE_LAYER, DATA_LAYER, DATA_LAYER_TRANSPARENCY } from './map-util-new';
import { Timeseries } from '@/types/Timeseries';
import { COLOR, ColorScaleType } from '@/utils/colors-util';

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
  selectedRegionIdsAtAllLevels: Ref<{ country: Set<string>; admin1: Set<string>; admin2: Set<string>; admin3: Set<string>; }>,
  selectedOutputVariables: Ref<Set<string>>,
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
    selectedRegionIdsAtAllLevels: selectedRegionIdsAtAllLevels.value,
    selectedOutputVariables: Array.from(selectedOutputVariables.value),
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
  currentOutputIndex: ComputedRef<number>,
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
