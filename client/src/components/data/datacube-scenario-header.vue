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
import { computed, defineComponent, PropType, ref, watch } from 'vue';

interface ParameterValue {
  id: string;
  value: string;
}

type ScenarioDescription = ParameterValue[];

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
    selectedModelId: {
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
    }
  },
  setup(props) {
    // Fetch input names
    const inputNames = ref<{ [key: string]: string }>({});
    async function fetchInputNames() {
      inputNames.value = {};
      if (props.selectedModelId === null) return;

      const result = await API.get('fetch-demo-data', {
        params: {
          modelId: props.selectedModelId,
          type: 'metadata'
        }
      });
      const modelMetadata = JSON.parse(result.data);
      const inputNamesMap: { [key: string]: string } = {};
      modelMetadata.parameters.forEach((parameter: any) => {
        inputNamesMap[parameter.id] = parameter.name;
      });
      inputNames.value = inputNamesMap;
    }

    // Fetch scenario descriptions
    const scenarioDescriptions = ref<ScenarioDescription[]>([]);
    async function fetchScenarioDescriptions() {
      scenarioDescriptions.value = [];
      if (
        props.selectedModelId === null ||
        props.selectedScenarioIds.length === 0
      ) {
        return [];
      }
      const promises = props.selectedScenarioIds.map(scenarioId =>
        API.get('fetch-demo-data', {
          params: {
            modelId: props.selectedModelId,
            runId: scenarioId,
            type: 'metadata'
          }
        })
      );
      const allMetadata = (await Promise.all(promises)).map(metadata =>
        JSON.parse(metadata.data)
      );
      scenarioDescriptions.value = allMetadata.map(scenarioMetadata => {
        return scenarioMetadata.parameters;
      });
    }

    watch(() => props.selectedModelId, fetchInputNames, { immediate: true });
    watch(() => props.selectedScenarioIds, fetchScenarioDescriptions, {
      immediate: true
    });
    const inputParameters = computed(() => {
      if (
        scenarioDescriptions.value.length === 0 ||
        Object.keys(inputNames.value).length === 0
      ) {
        return [];
      }

      // CLEANUP: There may be a simpler way of stitching these
      //  data structures together that we should investigate
      //  after the upcoming site visit (April 2021)
      return Object.keys(inputNames.value).map(inputId => {
        return {
          name: inputNames.value[inputId],
          values: scenarioDescriptions.value.map(parameterValues => {
            return (
              parameterValues.find(parameter => parameter.id === inputId)
                ?.value ?? 'undefined'
            );
          })
        };
      });
    });

    return {
      inputParameters
    };
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

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
