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
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, PropType, Ref } from 'vue';
import DropdownButton from '@/components/dropdown-button.vue';
import { CAGGraph } from '@/types/CAG';
import { findCycles } from '@/utils/graphs-util';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';

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
    modelComponents: {
      type: Object as PropType<CAGGraph>,
      default: null
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
}
</style>
