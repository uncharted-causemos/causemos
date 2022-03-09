<template>
  <div class="analytics-pane">
    <dropdown-button
      :is-dropdown-left-aligned="true"
      :inner-button-label="'Analysis'"
      :items="analyses"
      :selected-item="currentAnalysis"
      @item-selected="changeAnalysis"
    />

    <div v-if="currentAnalysis === 'cycles'">
      <div v-if="cyclesPaths && cyclesPaths.balancing.length > 0" class="cycles-result">
        <strong> Balancing Loops </strong>
        <div v-for="(path, idx) of cyclesPaths.balancing" :key="idx">
          <cag-path-item :path-item="path" @click="showPath(path)" />
        </div>
      </div>
      <div v-if="cyclesPaths && cyclesPaths.reinforcing.length > 0" class="cycles-result">
        <strong> Reinforcing Loops</strong>
        <div v-for="(path, idx) of cyclesPaths.reinforcing" :key="idx">
          <cag-path-item :path-item="path" @click="showPath(path)" />
        </div>
      </div>
      <div v-if="cyclesPaths && cyclesPaths.ambiguous.length > 0" class="cycles-result">
        <strong> Ambiguous Loops </strong>
        <div v-for="(path, idx) of cyclesPaths.ambiguous" :key="idx">
          <cag-path-item :path-item="path" @click="showPath(path)" />
        </div>
      </div>
      <div v-if="totalCycles === 0">
        No cycles detected.
      </div>
    </div>

    <div v-if="currentAnalysis === 'paths'">
      Path sensitivity
      <dropdown-button
        :is-dropdown-left-aligned="true"
        :inner-button-label="'Source'"
        :items="availableNodes"
        :selected-item="currentPathSource"
        @item-selected="changePathSource"
      />
      <dropdown-button
        :is-dropdown-left-aligned="true"
        :inner-button-label="'Target'"
        :items="availableNodes"
        :selected-item="currentPathTarget"
        @item-selected="changePathTarget"
      />
      <div class="pathway-exec-summary">
        <button class="btn btn-small btn-primary"
          @click="runPathwayAnalysis">
          Run pathway sensitivity
        </button>
      </div>

      <!-- paht results -->
      <div>
        <div v-if="pathExperimentId && pathExperimentResult.length === 0">
          <i class="fa fa-spinner fa-spin" /> Running experiment
        </div>
        <div v-if="pathExperimentId && pathExperimentResult.length > 0">
          <div v-for="(path, idx) of pathExperimentResult" :key="idx">
            <cag-path-item :path-item="path" @click="showPath(path)" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, defineComponent, ref, PropType, Ref } from 'vue';
import { useStore } from 'vuex';
import DropdownButton from '@/components/dropdown-button.vue';
import CagPathItem from '@/components/cag/cag-path-item.vue';
import { findCycles, classifyCycles, Vertex } from '@/utils/graphs-util';
import modelService from '@/services/model-service';
import useToaster from '@/services/composables/useToaster';

import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import { CAGGraph, CAGModelSummary, Scenario, GraphPath, ConceptProjectionConstraints } from '@/types/CAG';

const ANALYSES = [
  { displayName: 'Feedback Loops', value: 'cycles' },
  { displayName: 'Influence Paths', value: 'paths' }
];

interface CycleAnalysis {
  balancing: GraphPath[];
  reinforcing: GraphPath[];
  ambiguous: GraphPath[];
}

const shortestToLongest = (a: GraphPath, b: GraphPath) => {
  return a.path.length - b.path.length;
};

export default defineComponent({
  name: 'CAGAnalyticsPane',
  components: {
    DropdownButton,
    CagPathItem
  },
  emits: ['show-path'],
  props: {
    modelSummary: {
      type: Object as PropType<CAGModelSummary>,
      default: null
    },
    modelComponents: {
      type: Object as PropType<CAGGraph>,
      default: null
    },
    scenarios: {
      type: Array as PropType<Scenario[]>,
      default: () => []
    }
  },
  setup(props) {
    const store = useStore();
    const currentAnalysis = ref('cycles');
    const cyclesPaths = ref({ balancing: [], reinforcing: [], ambiguous: [] }) as Ref<CycleAnalysis>;

    const totalCycles = computed(() => {
      if (_.isEmpty(cyclesPaths.value)) return 0;
      return cyclesPaths.value.balancing.length + cyclesPaths.value.reinforcing.length + cyclesPaths.value.ambiguous.length;
    });

    const currentPathSource = ref('');
    const currentPathTarget = ref('');
    const ontologyFormatter = useOntologyFormatter();
    const currentCAG = computed(() => {
      return store.getters['app/currentCAG'];
    });
    const selectedScenarioId = computed(() => {
      return store.getters['model/selectedScenarioId'];
    });

    const pathExperimentId = ref('');
    const pathExperimentResult = ref([]) as Ref<GraphPath[]>;

    // FIXME: SHould have adapatble lists depending on selection e.g. reachable nodes
    const availableNodes = computed(() => {
      if (!props.modelComponents) return [];
      return props.modelComponents.nodes.map(node => {
        return {
          value: node.concept,
          displayName: ontologyFormatter(node.concept)
        };
      });
    });

    return {
      currentAnalysis,
      currentPathSource,
      currentPathTarget,
      currentCAG,
      selectedScenarioId,
      cyclesPaths,
      totalCycles,

      availableNodes,
      pathExperimentId,
      pathExperimentResult,

      toaster: useToaster(),

      analyses: ANALYSES
    };
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      if (this.currentAnalysis === 'cycles') {
        this.showCyclesAnalysis();
      }
    },
    showCyclesAnalysis() {
      const edges = this.modelComponents.edges;
      const cycleResult = classifyCycles(findCycles(edges), edges);

      const reformat = (p: Vertex[]) => {
        const fullPath = p.map(pItem => pItem.name);
        // Complete the cycle
        fullPath.push(p[0].name);
        return {
          path: fullPath,
          score: 1.0
        };
      };

      const balancing = cycleResult.balancing.map<GraphPath>(reformat);
      const reinforcing = cycleResult.reinforcing.map<GraphPath>(reformat);
      const ambiguous = cycleResult.ambiguous.map<GraphPath>(reformat);

      this.cyclesPaths = {
        balancing: balancing.sort(shortestToLongest),
        reinforcing: reinforcing.sort(shortestToLongest),
        ambiguous: ambiguous.sort(shortestToLongest)
      };
    },
    async runPathwayAnalysis() {
      if (_.isEmpty(this.currentPathSource) || _.isEmpty(this.currentPathTarget)) return;

      let constraints: ConceptProjectionConstraints[] = [];
      // If we're in "historical data only" mode, run pathway analysis with no
      //  constraints.
      if (this.selectedScenarioId !== null) {
        // Extract constraints
        const scenario = this.scenarios.find(s => s.id === this.selectedScenarioId);
        if (!scenario) return;
        constraints = scenario.parameter.constraints;
      }

      this.pathExperimentResult = [];
      this.pathExperimentId = await modelService.runPathwaySensitivityAnalysis(
        this.modelSummary,
        [this.currentPathSource],
        [this.currentPathTarget],
        modelService.cleanConstraints(constraints)
      );
      this.pollPathExperimentResult();
    },
    async pollPathExperimentResult() {
      const r = await modelService.getExperimentResultOnce(this.currentCAG, 'dyse', this.pathExperimentId);

      if (r.status === 'completed' && r.results) {
        const pathResult = r.results.pathways;
        this.pathExperimentResult = pathResult;
      } else {
        window.setTimeout(() => {
          this.pollPathExperimentResult();
        }, 5000);
      }
    },
    showPath(pathItem: GraphPath) {
      this.$emit('show-path', pathItem);
    },
    changeAnalysis(v: string) {
      const modelStale = this.modelSummary.status !== modelService.MODEL_STATUS.READY;
      const scenariosStale = _.some(this.scenarios, s => s.is_valid === false);
      if (scenariosStale || modelStale) {
        this.toaster('CAG or scenarios are stale, please click "Run" to synchronize first and then retry the path analysis.', 'error', true);
        return;
      }

      this.currentAnalysis = v;
      this.refresh();
    },
    changePathSource(v: string) {
      this.currentPathSource = v;
    },
    changePathTarget(v: string) {
      this.currentPathTarget = v;
    }
  }
});
</script>

<style lang="scss" scoped>
.analytics-pane {
  display: flex;
  flex-direction: column;

  .cycles-result {
    margin: 5px 0;
  }

  .pathway-exec-summary {
    margin-top: 5px;
    margin-bottom: 5px;
  }
}
</style>
