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
      Cycle analysis
      <div v-for="(path, idx) of cyclesPaths" :key="idx">
        <strong>{{idx}}</strong> {{ path }}
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
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, PropType, Ref } from 'vue';
import DropdownButton from '@/components/dropdown-button.vue';
import { findCycles } from '@/utils/graphs-util';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import { CAGGraph, CAGModelParameter, Scenario } from '@/types/CAG';

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
      type: Object as PropType<CAGModelParameter>,
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
    const currentAnalysis = ref('cycles');
    const cyclesPaths = ref([]) as Ref<any[]>;

    const currentPathSource = ref('');
    const currentPathTarget = ref('');
    const ontologyFormatter = useOntologyFormatter();

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
      cyclesPaths,

      availableNodes,

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
    runPathwayAnalysis() {
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
