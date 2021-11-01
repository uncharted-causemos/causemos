import { Indicator, Model, ModelParameter } from '../../types/Datacube';
import { computed, ref, Ref } from 'vue';
import { useStore } from 'vuex';
import { isModel } from '@/utils/datacube-util';

/**
 * Takes a model ID, transforms it into several structures that various components may utilize, for example the PC chart.
 */
export default function useDatacubeDimensions(
  metadata: Ref<Model | Indicator | null>
) {
  const store = useStore();
  const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
  const currentOutputIndex = computed(() => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);

  const inputDimensions = computed(() => {
    if (metadata.value !== null && isModel(metadata.value)) {
      return metadata.value.parameters;
    }
    return [];
  });

  const outputDimension = computed(() => {
    if (metadata.value === null || !isModel(metadata.value)) {
      return undefined;
    }
    const outputs = metadata.value?.validatedOutputs ? metadata.value?.validatedOutputs : metadata.value?.outputs;
    // Restructure the output parameter
    const outputDimension = outputs[currentOutputIndex.value];
    if (outputDimension === undefined) {
      console.warn('Missing output!', metadata.value);
      return undefined;
    }
    return outputs[currentOutputIndex.value];
  });

  const dimensions = computed(() => {
    if (metadata.value === null || !isModel(metadata.value)) {
      return [];
    }
    // Append the output parameter to the list of input parameters
    return [...inputDimensions.value, outputDimension.value] as ModelParameter[];
  });

  // The parallel coordinates component expects data as a collection of name/value pairs
  //  (see ScenarioData)
  //  e.g., [
  //    { dim1: value11, dim2: value12 },
  //    { dim1: value21, dim2: value22 }
  // ]

  // @HACK: this is not needed, but left in case quick testing of the ordinal capability is needed
  const ordinalDimensionNames = ref([]);

  const drilldownDimensions = computed(() =>
    dimensions.value.filter(p => p.is_drilldown)
  );

  return {
    dimensions,
    ordinalDimensionNames,
    drilldownDimensions
  };
}
