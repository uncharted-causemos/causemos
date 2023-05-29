import { Ref, computed, watch } from 'vue';
import { IndexProjectionCountry, IndexProjectionSettings } from '@/types/Index';
import { COLORS } from '@/utils/colors-util';
import { NO_COUNTRY_SELECTED_VALUE } from '@/utils/index-projection-util';
import _ from 'lodash';

const MAX_NUM_TIMESERIES = COLORS.length + 1; // + 1 for the added black color

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
    if (selectedCountries.value.length >= MAX_NUM_TIMESERIES) return;
    const used = selectedCountries.value.map((v) => v.color);
    return ['#000', ...COLORS].filter((v) => !used.includes(v)).shift();
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
