import { COLOR, ColorScaleType, COLOR_SCHEME, getColors, isDiscreteScale, isDivergingScheme } from '@/utils/colors-util';
import _ from 'lodash';
import { computed, ref } from 'vue';

// FIXME: use either "color scheme" or "color scale" throughout
export default function useDatacubeColorScheme() {
  // FIXME: rename to isColorSchemeReversed
  const colorSchemeReversed = ref(false);
  // FIXME: rename to setIsColorSchemeReversed
  const setColorSchemeReversed = (newValue: boolean) => {
    colorSchemeReversed.value = newValue;
  };

  const selectedColorSchemeName = ref<COLOR>(COLOR.DEFAULT);
  const setColorSchemeName = (schemeName: COLOR) => {
    selectedColorSchemeName.value = schemeName;
  };

  const selectedColorScaleType = ref(ColorScaleType.LinearDiscrete);
  const setColorScaleType = (scaleType: ColorScaleType) => {
    selectedColorScaleType.value = scaleType;
  };

  // assume default number of 5 bins on startup
  const numberOfColorBins = ref(5);
  const setNumberOfColorBins = (numBins: number) => {
    numberOfColorBins.value = numBins;
  };

  // Final color scheme represents the list of final colors that should be used, for example, in the map and its legend
  const finalColorScheme = computed(() => {
    const scheme = isDiscreteScale(selectedColorScaleType.value)
      ? getColors(selectedColorSchemeName.value, numberOfColorBins.value)
      : _.clone(COLOR_SCHEME[selectedColorSchemeName.value]);
    return colorSchemeReversed.value ? scheme.reverse() : scheme;
  });

  const isContinuousScale = computed(() => {
    return !isDiscreteScale(selectedColorScaleType.value);
  });
  const isDivergingScale = computed(() => {
    return isDivergingScheme(selectedColorSchemeName.value);
  });

  return {
    colorSchemeReversed,
    setColorSchemeReversed,
    selectedColorSchemeName,
    setColorSchemeName,
    selectedColorScaleType,
    setColorScaleType,
    numberOfColorBins,
    setNumberOfColorBins,
    finalColorScheme,
    isContinuousScale,
    isDivergingScale
  };
}
