import { AnalysisMapColorOptions } from '@/types/Common';
import {
  COLOR,
  ColorScaleType,
  COLOR_SCHEME,
  isDiscreteScale,
  isDivergingScheme,
  SCALE_FUNCTION,
  getColorScheme,
} from '@/utils/colors-util';
import { DATA_LAYER_TRANSPARENCY } from '@/utils/map-util-new';
import _ from 'lodash';
import { computed, ref } from 'vue';

// FIXME: use either "color scheme" or "color scale" throughout
export default function useDatacubeColorScheme() {
  const selectedDataLayerTransparency = ref(DATA_LAYER_TRANSPARENCY['100%']);
  const setDataLayerTransparency = (val: DATA_LAYER_TRANSPARENCY) => {
    selectedDataLayerTransparency.value = val;
  };

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
    return getColorScheme(
      selectedColorScaleType.value,
      selectedColorSchemeName.value,
      numberOfColorBins.value,
      colorSchemeReversed.value
    );
  });

  const isContinuousScale = computed(() => {
    return !isDiscreteScale(selectedColorScaleType.value);
  });
  const isDivergingScale = computed(() => {
    return isDivergingScheme(selectedColorSchemeName.value);
  });

  const mapColorOptions = computed(() => {
    const options: AnalysisMapColorOptions = {
      scheme: finalColorScheme.value,
      relativeToSchemes: [COLOR_SCHEME.GREYS_7, COLOR_SCHEME.PIYG_7],
      scaleFn: SCALE_FUNCTION[selectedColorScaleType.value],
      isContinuous: isContinuousScale.value,
      isDiverging: isDivergingScale.value,
      opacity: Number(selectedDataLayerTransparency.value),
    };
    return options;
  });

  return {
    selectedDataLayerTransparency,
    setDataLayerTransparency,
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
    isDivergingScale,
    mapColorOptions,
  };
}
