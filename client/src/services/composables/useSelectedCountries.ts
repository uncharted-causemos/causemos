import { Ref, computed, watch } from 'vue';
import { IndexProjectionCountry, IndexProjectionSettings } from '@/types/Index';
import {
  NO_COUNTRY_SELECTED_VALUE,
  getAvailableTimeseriesColor,
} from '@/utils/index-projection-util';
import _ from 'lodash';

export default function useSelectedCountries(
  selectableCountries: Ref<string[]>,
  indexProjectionSettings: Ref<IndexProjectionSettings>,
  updateIndexProjectionSettings: (settings: IndexProjectionSettings) => void
) {
  // The countries whose historical data and projections are be displayed when multiple country mode
  //  is active.
  const selectedCountries = computed(() => indexProjectionSettings.value.selectedCountries);

  const updateSelectedCountries = (countries: IndexProjectionCountry[]) => {
    updateIndexProjectionSettings({
      ...indexProjectionSettings.value,
      selectedCountries: countries,
    });
  };

  const getAvailableCountryColor = () => {
    const usedColors = selectedCountries.value.map((v) => v.color);
    return getAvailableTimeseriesColor(usedColors);
  };

  const addSelectedCountry = () => {
    const color = getAvailableCountryColor();
    if (!color) return;
    updateSelectedCountries([
      ...selectedCountries.value,
      { name: NO_COUNTRY_SELECTED_VALUE, color },
    ]);
  };

  const removeSelectedCountry = (arrayPosition: number) => {
    updateSelectedCountries(selectedCountries.value.filter((country, i) => i !== arrayPosition));
  };

  const changeSelectedCountry = (arrayPosition: number, newCountry: string) => {
    const newSelectedCountries = _.cloneDeep(selectedCountries.value);
    newSelectedCountries[arrayPosition].name = newCountry;
    updateSelectedCountries(newSelectedCountries);
  };

  // Whenever the list of selectable countries changes, if a currently selected country is not found
  //  in the list, reset it to NO_COUNTRY_SELECTED.value.
  watch([selectableCountries], () => {
    const newSelectedCountries = _.cloneDeep(selectedCountries.value);
    newSelectedCountries.forEach((selectedCountry) => {
      const found = selectableCountries.value.find(
        (selectableCountry) => selectedCountry.name === selectableCountry
      );
      if (found === undefined) {
        selectedCountry.name = NO_COUNTRY_SELECTED_VALUE;
      }
    });
    updateSelectedCountries(newSelectedCountries);
  });

  return {
    selectedCountries,
    addSelectedCountry,
    removeSelectedCountry,
    changeSelectedCountry,
  };
}
