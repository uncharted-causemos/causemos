<template>
  <div class="run-header">
    <h6>{{ outputVariable }} ({{ outputVariableUnits }})</h6>
    <div>
      <span
        v-for="parameter in inputParameters"
        :key="parameter.name"
        class="scenario-input"
      >
        <label>{{ parameter.name }}</label>
        <span v-for="(value, index) of parameter.values" :key="index">
          {{ index > 0 ? ', ' : '' }}
          <span :style="{ color: colorFromIndex(index) }">
            {{ value }}
          </span>
        </span>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import API from '@/api/api';
import {
  computed,
  defineComponent,
  PropType,
  ref,
  toRefs,
  watchEffect
} from 'vue';
import { ModelRun, ModelRunParameter } from '@/types/ModelRun';
import { Model } from '@/types/Datacube';

type ScenarioDescription = ModelRunParameter[];

export default defineComponent({
  name: 'DatacubeScenarioHeader',
  props: {
    outputVariable: {
      type: String,
      required: true
    },
    outputVariableUnits: {
      type: String,
      required: true
    },
    selectedScenarioIds: {
      type: Array as PropType<string[]>,
      required: true
    },
    colorFromIndex: {
      type: Function as PropType<(index: number) => string>,
      default: () => '#000'
    },
    metadata: {
      type: Object as PropType<Model | null>,
      default: null
    }
  },
  setup(props) {
    const { metadata, selectedScenarioIds } = toRefs(props);
    if (metadata.value === null) return;
    const inputNames = computed(() => {
      if (metadata.value === null) return {};
      const inputNamesMap: { [key: string]: string } = {};
      metadata.value.parameters.forEach(parameter => {
        inputNamesMap[parameter.name] = parameter.display_name;
      });
      return inputNamesMap;
    });

    const scenarioDescriptions = ref<ScenarioDescription[]>([]);
    watchEffect(async () => {
      scenarioDescriptions.value = [];
      if (metadata.value === null || selectedScenarioIds.value.length === 0) {
        return [];
      }
      // Fetch scenario descriptions
      const allMetadata = await API.get('/maas/model-runs', {
        params: {
          modelId: metadata.value.id
        }
      });
      scenarioDescriptions.value = allMetadata.data
        .filter((run: ModelRun) => selectedScenarioIds.value.includes(run.id))
        .map((scenarioMetadata: ModelRun) => {
          return scenarioMetadata.parameters;
        });
    });
    const inputParameters = computed(() => {
      if (
        scenarioDescriptions.value.length === 0 ||
        Object.keys(inputNames.value).length === 0
      ) {
        return [];
      }

      return Object.keys(inputNames.value).map(inputName => ({
        name: inputNames.value[inputName],
        values: scenarioDescriptions.value.map(
          parameterValues =>
            parameterValues.find(({ name }) => name === inputName)?.value ??
            'missing'
        )
      }));
    });

    return {
      inputParameters
    };
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.run-header {
  min-height: 70px;
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
