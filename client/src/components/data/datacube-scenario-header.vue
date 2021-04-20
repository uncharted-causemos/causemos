<template>
  <div class="run-header">
    <h6>{{ outputVariable }} ({{ outputVariableUnits }})</h6>
    <div>
      <span
        v-for="inputParameter in inputParameters"
        :key="inputParameter"
        class="scenario-input"
      >
        <label>{{ inputParameter }}</label>
        <span v-for="(scenario, index) of selectedScenarios" :key="index">
          {{ index > 0 ? ', ' : '' }}
          <span :style="{ color: scenario._SCENARIO_COLOR }">
            {{ scenario[inputParameter] }}
          </span>
        </span>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from 'vue';

interface ScenarioDescription {
  _SCENARIO_COLOR: string;
  [key: string]: string | number;
}

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
    selectedScenarios: {
      type: Array as PropType<ScenarioDescription[]>,
      required: true
    }
  },
  setup(props) {
    const inputParameters = computed(() =>
      Object.keys(props.selectedScenarios[0]).filter(
        key => key !== '_SCENARIO_COLOR' && key !== '_SCENARIO_ID' && key !== 'id'
      )
    );
    return { inputParameters };
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
