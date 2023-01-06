<template>
  <div class="run-header">
    <span v-for="parameter in inputParameters" :key="parameter.name" class="scenario-input">
      <label>{{ parameter.name }}</label>
      <span v-for="(value, index) of parameter.values" :key="index">
        {{ index > 0 ? ', ' : '' }}
        <span :style="{ color: colorFromIndex(index) }">
          {{ value }}
        </span>
      </span>
    </span>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs, watchEffect } from 'vue';
import { ModelRun, ModelRunParameter } from '@/types/ModelRun';
import { Model } from '@/types/Datacube';

type ScenarioDescription = ModelRunParameter[];

export default defineComponent({
  name: 'DatacubeScenarioHeader',
  props: {
    selectedScenarioIds: {
      type: Array as PropType<string[]>,
      required: true,
    },
    colorFromIndex: {
      type: Function as PropType<(index: number) => string>,
      default: () => '#000',
    },
    metadata: {
      type: Object as PropType<Model | null>,
      default: null,
    },
    modelRunData: {
      type: Array as PropType<ModelRun[]>,
      default: [],
    },
  },
  setup(props) {
    const { metadata, selectedScenarioIds, modelRunData } = toRefs(props);
    const inputNames = computed(() => {
      if (metadata.value === null) return {};
      const inputNamesMap: { [key: string]: string } = {};
      metadata.value.parameters.forEach((parameter) => {
        inputNamesMap[parameter.name] = parameter.display_name;
      });
      return inputNamesMap;
    });
    const scenarioDescriptions = ref<ScenarioDescription[]>([]);
    watchEffect(() => {
      scenarioDescriptions.value = [];
      if (
        metadata.value === null ||
        selectedScenarioIds.value.length === 0 ||
        modelRunData.value.length === 0
      ) {
        return [];
      }
      scenarioDescriptions.value = modelRunData.value
        .filter((run) => selectedScenarioIds.value.includes(run.id))
        .map((scenarioMetadata) => {
          return scenarioMetadata.parameters;
        });
    });
    const inputParameters = computed(() => {
      return Object.keys(inputNames.value).map((inputName) => ({
        name: inputNames.value[inputName],
        values: scenarioDescriptions.value.map(
          (parameterValues) =>
            parameterValues.find(({ name }) => name === inputName)?.value ?? 'missing'
        ),
      }));
    });

    return {
      inputParameters,
    };
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.run-header {
  height: 54px;
  margin-top: 10px;
  overflow-y: auto;
}

h6 {
  font-size: $font-size-large;
  margin: 0;
}

.scenario-input {
  margin-right: 20px;
  label {
    font-weight: normal;
    margin-right: 5px;
  }
}
</style>
