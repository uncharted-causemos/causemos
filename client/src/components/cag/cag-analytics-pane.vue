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
      <div v-for="(path, idx) of cyclesPaths" :key="idx">
        <strong>{{idx}}</strong> {{ path }}
      </div>
      <div v-if="cyclesPaths.length === 0">
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
        <div v-if="pathExperiemntId && !pathExperimentResult">
          <i class="fa fa-spinner fa-spin" /> Running experiment
        </div>
        <div v-if="pathExperiemntId && pathExperimentResult">
          {{ pathExperimentResult }}
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
import { findCycles } from '@/utils/graphs-util';
import modelService from '@/services/model-service';

import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import { CAGGraph, CAGModelSummary, Scenario } from '@/types/CAG';

const ANALYSES = [
  { displayName: 'Cycle analysis', value: 'cycles' },
  { displayName: 'Path sensitivity', value: 'paths' }
];

export default defineComponent({
  name: 'CAGAnalyticsPane',
  components: {
    DropdownButton
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
    const cyclesPaths = ref([]) as Ref<any[]>;

    const currentPathSource = ref('');
    const currentPathTarget = ref('');
    const ontologyFormatter = useOntologyFormatter();
    const currentCAG = computed(() => {
      return store.getters['app/currentCAG'];
    });

    const pathExperiemntId = ref('');
    const pathExperimentResult = ref(null) as Ref<any>;

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
      this.cyclesPaths = findCycles(this.modelComponents.edges);
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
        this.pathExperimentResult = r.results;
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
