import {
  ReferenceSeriesOption,
  SpatialAggregationLevel,
  TemporalAggregationLevel
} from '@/types/Enums';
import { ModelRunReference } from '@/types/ModelRunReference';
import { RegionalAggregations } from '@/types/Outputdata';
import { computed, Ref, watch, watchEffect } from 'vue';

export default function useReferenceSeries(
  activeReferenceOptions: Ref<string[]>,
  breakdownOption: Ref<string | null>,
  selectedAdminLevel: Ref<number>,
  regionalData: Ref<RegionalAggregations | null>
) {
  // Clear active reference options when selected admin level is country in
  //  split by region mode.
  watchEffect(() => {
    if (
      breakdownOption.value === SpatialAggregationLevel.Region &&
      selectedAdminLevel.value === 0
    ) {
      activeReferenceOptions.value = [];
    }
  });
  // Clear active reference options whenever breakdownOption changes.
  watch([breakdownOption], () => {
    activeReferenceOptions.value = [];
  });
  const toggleReferenceOptions = (value: string) => {
    if (activeReferenceOptions.value.includes(value)) {
      activeReferenceOptions.value = activeReferenceOptions.value.filter(
        r => r !== value
      );
    } else {
      activeReferenceOptions.value.push(value);
    }
  };

  const availableReferenceOptions = computed<ModelRunReference[]>(() => {
    let options: { id: string; displayName: string }[] = [];
    if (breakdownOption.value === TemporalAggregationLevel.Year) {
      options = [
        {
          id: ReferenceSeriesOption.AllYears,
          displayName: 'Average All Years'
        },
        {
          id: ReferenceSeriesOption.SelectYears,
          displayName: 'Average Selected Years'
        }
      ];
    } else if (breakdownOption.value === SpatialAggregationLevel.Region) {
      // if selected admin level is lower than country, add countries as references.
      if (selectedAdminLevel.value > 0 && regionalData.value?.country) {
        regionalData.value.country.forEach(refRegion => {
          options.push({
            id: refRegion.id,
            displayName: refRegion.id
          });
        });
      }
      // TODO: add averaging options if (selectedRegionIds.value.length > 1)
      // {
      //   id: ReferenceSeriesOption.SelectRegions,
      //   displayName: 'Average Selected Regions'
      // });
    }
    return options.map(({ id, displayName }) => ({
      id,
      displayName,
      checked: activeReferenceOptions.value.includes(id)
    }));
  });

  return {
    activeReferenceOptions,
    availableReferenceOptions,
    toggleReferenceOptions
  };
}
