<template>
<div>
  <h5>
    {{selectedNode.label}}
  </h5>
  <div class="inline-group-justified">
    <RadioButtonGroup
      :buttons="tabs"
      :selected-button-value="activeTab"
      @button-clicked="setActiveTab"
    >

    </RadioButtonGroup>
    <button
      class="btn btn-sm btn-primary right"
      @click="openFullDrilldown"
    >
      Open Node Drilldown
    </button>
  </div>
  <div>
    <message-display
      v-if="modelStale"
      :message="'CAG is stale. Node sensitivity may be invalid, please click Run to synchronize and get the updated results.'"
    />
    <div v-if="paneSensitivityResult?.result?.status && paneSensitivityResult?.result?.status !== 'completed'">
      Sensitivity Analysis In Progress
      <div v-if="paneSensitivityResult?.result?.progressPercentage">
        {{(paneSensitivityResult.result.progressPercentage * 100, 2).toFixed(2)}}% Complete
      </div>
    </div>
    <div v-if="activeTab === TAB_IDS.DRIVERS">
      <div
        class="inline-group"
        v-for="driver in drivers"
        :active="driver.node?.id === activeNode?.id"
        :key="driver.concept"
        @click="highlightNodePaths(driver.node, 'source')"
      >
        <importance-bars
          v-if="maxSensitivity"
          class="sensitivity-margin"
          label="driver"
          :importance="driver.value"
          :max="maxSensitivity"
        >
        </importance-bars>
        {{driver.node?.label}}
      </div>
      <div
        v-if="drivers.length === 0"
        class="inline-group"
      >
        No drivers available.
      </div>
    </div>
    <div v-if="activeTab === TAB_IDS.IMPACTS">
      <div
        class="inline-group"
        v-for="impact in impacts"
        :active="impact.node?.id === activeNode?.id"
        :key="impact.concept"
        @click="highlightNodePaths(impact.node, 'target')"
      >
        <importance-bars
          v-if="maxSensitivity"
          class="sensitivity-margin"
          label="impact"
          :importance="impact.value"
          :max="maxSensitivity"
        >
        </importance-bars>
        {{impact.node?.label}}
      </div>
      <div
        v-if="impacts.length === 0"
        class="inline-group"
      >
        No impacts available.
      </div>
    </div>
  </div>
</div>
</template>
<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs, watch, watchEffect } from 'vue';
import { useStore } from 'vuex';
import modelService from '@/services/model-service';
import { CAGGraph, CAGModelSummary, NodeParameter } from '@/types/CAG';
import ImportanceBars from '../widgets/importance-bars.vue';
import RadioButtonGroup from '../widgets/radio-button-group.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';

export default defineComponent({
  name: 'SensitivityPane',
  components: {
    ImportanceBars,
    RadioButtonGroup,
    MessageDisplay
  },
  emits: ['open-drilldown', 'highlight-node-paths'],
  props: {
    modelSummary: {
      type: Object as PropType<CAGModelSummary>,
      required: true
    },
    modelComponents: {
      type: Object as PropType<CAGGraph>,
      default: null
    },
    selectedNode: {
      type: Object as PropType<NodeParameter>,
      default: null
    },
    sensitivityResult: {
      type: Object as PropType<Record<string, any>>,
      default: null
    }
  },
  setup(props) {
    const store = useStore();
    const {
      modelSummary,
      modelComponents,
      selectedNode,
      sensitivityResult
    } = toRefs(props);

    const paneSensitivityResult = ref(sensitivityResult.value);

    const currentCAG = computed(() => store.getters['app/currentCAG']);

    const TAB_IDS = {
      DRIVERS: 'drivers',
      IMPACTS: 'impacts'
    };
    const tabs = [
      {
        label: 'Drivers',
        value: TAB_IDS.DRIVERS
      },
      {
        label: 'Impacts',
        value: TAB_IDS.IMPACTS
      }
    ];
    const activeTab = ref('');
    const activeNode = ref({} as NodeParameter|null);

    // polling code as sensitivity may not be ready on panel open
    const poll = async (): Promise<void> => {
      const r = await modelService.getExperimentResultOnce(currentCAG.value, 'dyse', sensitivityResult.value.experiment_id);
      if (r.status === 'completed' && r.results) {
        processSensitivityResult(r);
      } else {
        updatePollingProgress(r);
      }
    };
    const updatePollingProgress = (result: Promise<void>) => {
      paneSensitivityResult.value.result = result;
      window.setTimeout(() => {
        poll();
      }, 5000);
    };
    const processSensitivityResult = async (result: Promise<void>) => {
      await modelService.updateScenarioSensitivityResult(
        sensitivityResult.value.id,
        sensitivityResult.value.experiment_id,
        result);
      paneSensitivityResult.value.result = result;
    };

    if (sensitivityResult.value !== null &&
      (!sensitivityResult.value.result || sensitivityResult.value.is_valid === false)
    ) {
      poll();
    }

    const selectedConcept = computed(() => {
      if (selectedNode.value === null) {
        return null;
      }
      return selectedNode.value.concept;
    });

    const sensitivityData = computed(() => {
      if (
        paneSensitivityResult.value === null ||
        !paneSensitivityResult.value.result ||
        !paneSensitivityResult.value.result.results ||
        !paneSensitivityResult.value.result.results.global
      ) {
        return null;
      }
      return paneSensitivityResult.value.result.results.global;
    });

    const concepts = computed((): string[]|null => {
      if (sensitivityData.value === null) {
        return null;
      }
      return Object.keys(sensitivityData.value);
    });

    const maxSensitivity = computed(() => {
      if (concepts.value === null) {
        return null;
      }
      const sensitivities = concepts.value.reduce((acc, concept) => {
        return acc.concat(Object.values(sensitivityData.value[concept]).filter(v => v !== 0) as number[]);
      }, [] as number[]);
      return Math.max(...sensitivities);
    });

    const drivers = computed(() => {
      if (
        modelComponents.value === null ||
        sensitivityData.value === null ||
        selectedConcept.value === null ||
        concepts.value === null
      ) {
        return [];
      }
      const { nodes } = modelComponents.value;

      return concepts.value
        .filter(concept => sensitivityData.value[concept][selectedConcept.value as string] !== 0)
        .map(concept => {
          return {
            concept,
            node: nodes.find(node => node.concept === concept),
            // as string needed because despite the null check, compiler complained about possible null
            value: sensitivityData.value[concept][selectedConcept.value as string]
          };
        })
        .sort((a, b) => b.value - a.value);
    });
    const impacts = computed(() => {
      if (
        modelComponents.value === null ||
        selectedConcept.value === null ||
        sensitivityData.value === null ||
        concepts.value === null
      ) {
        return [];
      }
      const { nodes } = modelComponents.value;
      const impactSet = sensitivityData.value[selectedConcept.value];
      return concepts.value
        .filter(concept => impactSet[concept] !== 0)
        .map(concept => {
          return {
            concept,
            node: nodes.find(node => node.concept === concept),
            value: impactSet[concept]
          };
        })
        .sort((a, b) => b.value - a.value);
    });

    watchEffect(() => {
      if (activeTab.value.length > 0) return;
      if (drivers.value.length > 0) {
        activeTab.value = TAB_IDS.DRIVERS;
      } else if (drivers.value.length === 0 && impacts.value.length > 0) {
        activeTab.value = TAB_IDS.IMPACTS;
      }
    });

    watch(selectedNode, (newNode, oldNode) => {
      if (newNode?.id !== oldNode?.id) {
        activeNode.value = null;
      }
    });

    watch(sensitivityResult, (newResult, oldResult) => {
      if (newResult.id !== oldResult) {
        paneSensitivityResult.value = newResult;
      }
    });

    const modelStale = ref(false);

    watch(modelSummary, () => {
      const engine = modelSummary.value.parameter.engine;
      const status = modelSummary.value.engine_status[engine];
      if (modelService.MODEL_STATUS.NOT_REGISTERED === status) {
        modelStale.value = true;
      } else {
        modelStale.value = false;
      }
    }, { immediate: true });


    return {
      modelStale,
      activeTab,
      activeNode,
      drivers,
      impacts,
      maxSensitivity,
      paneSensitivityResult,
      tabs,
      TAB_IDS
    };
  },
  methods: {
    openFullDrilldown() {
      this.$emit('open-drilldown', this.selectedNode);
    },
    highlightNodePaths(node: any, type: string) {
      this.activeNode = node;
      this.$emit('highlight-node-paths', node, type);
    },
    setActiveTab(activeTab: string) {
      this.activeTab = activeTab;
    }
  }
});
</script>
<style lang="scss" scoped>
@import '~styles/variables';

// coordinated highilght with graph
$annotation-color: lighten(#8767c8, 30%);

.inline-group-justified {
  display: inline-flex;
  justify-content: space-between;
  width: 100%;
  padding: 3px 0;
}
.inline-group {
  display: inline-flex;
  width: 100%;
  padding: 3px;
  &:hover {
    background-color: $annotation-color;
    cursor: pointer;
  }
  &[active=true]{
    background-color: $annotation-color;
  }
}
.sensitivity-margin {
  margin-right: 5px;
}
</style>
