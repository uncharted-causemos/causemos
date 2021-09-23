
import { ComputedRef, Ref } from 'vue';
import { DatacubeFeature, Indicator, Model } from '@/types/Datacube';
import { DataState, ViewState } from '@/types/Insight';
import { AggregationOption, TemporalResolutionOption } from '@/types/Enums';
import { BASE_LAYER, DATA_LAYER } from './map-util-new';

export const aggregationOptionFiltered = Object.values(AggregationOption).filter(ao => AggregationOption.None as string !== ao);
export const temporalResolutionOptionFiltered = Object.values(TemporalResolutionOption).filter(tro => TemporalResolutionOption.None as string !== tro);

export function initDataStateFromRefs (
  mainModelOutput: Ref<DatacubeFeature|undefined>,
  metadata: Ref<Model|Indicator|null>,
  relativeTo: Ref<string|null>,
  selectedModelId: Ref<any>,
  selectedQualifierValues: Ref<Set<string>>,
  selectedRegionIds: Ref<string[]>,
  selectedScenarioIds: Ref<string[]>,
  selectedTimestamp: Ref<number|null>,
  selectedYears: Ref<Set<string>>
): DataState {
  return {
    selectedModelId: selectedModelId.value,
    selectedScenarioIds: selectedScenarioIds.value,
    selectedTimestamp: selectedTimestamp.value,
    datacubeTitles: [{
      datacubeName: metadata.value?.name ?? '',
      datacubeOutputName: mainModelOutput?.value?.display_name ?? ''
    }],
    datacubeRegions: metadata.value?.geography.country, // FIXME: later this could be the selected region for each datacube
    selectedRegionIds: selectedRegionIds.value,
    relativeTo: relativeTo.value,
    selectedQualifierValues: [...selectedQualifierValues.value],
    selectedYears: [...selectedYears.value]
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
  selectedTemporalResolution: Ref<TemporalResolutionOption>
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
    selectedAdminLevel: selectedAdminLevel.value
  };
}