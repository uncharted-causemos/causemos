<template>
  <div class="analytics-pane">
    <div>Graph analytics</div>
    <dropdown-button
      :is-dropdown-left-aligned="true"
      :inner-button-label="'Analysis'"
      :items="analyses"
      :selected-item="currentAnalysis"
      @item-selected="changeAnalysis"
    />

    <div v-if="currentAnalysis === 'cycles'">
      <!--
      <div v-for="(path, idx) of cyclesPaths" :key="idx">
        <strong>{{idx}}</strong> {{ path }}
      </div>
      -->
      <div v-if="cyclesPaths && cyclesPaths.balancing.length > 0">
        <div> Balancing paths </div>
        <div v-for="(path, idx) of cyclesPaths.balancing" :key="idx">
          <cag-path-item :path-item="path" />
        </div>
      </div>
      <div v-if="cyclesPaths && cyclesPaths.reinforcing.length > 0">
        <div> Reinforcing paths </div>
        <div v-for="(path, idx) of cyclesPaths.reinforcing" :key="idx">
          <cag-path-item :path-item="path" />
        </div>
      </div>
      <div v-if="cyclesPaths && cyclesPaths.ambiguous.length > 0">
        <div> Ambiguous paths </div>
        <div v-for="(path, idx) of cyclesPaths.ambiguous" :key="idx">
          <cag-path-item :path-item="path" />
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
        <div v-if="pathExperiemntId && pathExperimentResult.length === 0">
          <i class="fa fa-spinner fa-spin" /> Running experiment
        </div>
        <div v-if="pathExperiemntId && pathExperimentResult.length > 0">
          <div v-for="(path, idx) of pathExperimentResult" :key="idx">
          {{ path }}
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
import { findCycles, classifyCycles } from '@/utils/graphs-util';
import modelService from '@/services/model-service';

import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import { CAGGraph, CAGModelSummary, Scenario, GraphPath } from '@/types/CAG';

const ANALYSES = [
  { displayName: 'Cycle analysis', value: 'cycles' },
  { displayName: 'Path sensitivity', value: 'paths' }
];

interface CycleAnalysis {
  balancing: GraphPath[];
  reinforcing: GraphPath[];
  ambiguous: GraphPath[];
}

interface CycleAnalysisItem {
  name: string;
}

export default defineComponent({
  name: 'CAGAnalyticsPane',
  components: {
    DropdownButton,
    CagPathItem
  },
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

    const pathExperiemntId = ref('');
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
      cyclesPaths,
      totalCycles,

      availableNodes,
      pathExperiemntId,
      pathExperimentResult,

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

      const reformat = (p: CycleAnalysisItem[]) => {
        return {
          path: p.map(pItem => pItem.name),
          score: 1.0
        };
      };

      cycleResult.balancing = cycleResult.balancing.map(reformat);
      cycleResult.reinforcing = cycleResult.reinforcing.map(reformat);
      cycleResult.ambiguous = cycleResult.ambiguous.map(reformat);

      this.cyclesPaths = cycleResult;
    },
    async runPathwayAnalysis() {
      if (_.isEmpty(this.currentPathSource) || _.isEmpty(this.currentPathTarget)) return;
      this.pathExperiemntId = await modelService.runPathwaySensitivityAnalysis(
        this.modelSummary,
        [this.currentPathSource],
        [this.currentPathTarget],
        []
      );
      console.log('path exp', this.pathExperiemntId);
      this.pollPathExperimentResult();
    },
    async pollPathExperimentResult() {
      const r = await modelService.getExperimentResultOnce(this.currentCAG, 'dyse', this.pathExperiemntId);

      if (r.status === 'completed' && r.results) {
        const pathResult = r.results.pathways;
        this.pathExperimentResult = pathResult;
      } else {
        window.setTimeout(() => {
          this.pollPathExperimentResult();
        }, 5000);
      }
    },
    changeAnalysis(v: string) {
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


  .pathway-exec-summary {
    margin-top: 5px;
    margin-bottom: 5px;
  }
}
</style>
