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
import { ModelRun, ModelRunParameter } from '@/types/Datacubes';

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
        inputNamesMap[parameter.name] = parameter.display_name;
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
      const allMetadata = await API.get('/maas/model-runs', {
        params: {
          modelId: props.selectedModelId
        }
      });
      scenarioDescriptions.value = allMetadata.data
        .filter((run: ModelRun) => props.selectedScenarioIds.includes(run.id))
        .map((scenarioMetadata: ModelRun) => {
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
      return Object.keys(inputNames.value).map(inputName => {
        return {
          name: inputName,
          values: scenarioDescriptions.value.map(parameterValues => {
            return (
              parameterValues.find(parameter => parameter.name === inputName)
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
