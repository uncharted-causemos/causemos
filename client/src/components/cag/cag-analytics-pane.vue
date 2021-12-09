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
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, PropType, Ref } from 'vue';
import DropdownButton from '@/components/dropdown-button.vue';
import { CAGGraph } from '@/types/CAG';
import { findCycles } from '@/utils/graphs-util';


const ANALYSES = [
  { displayName: 'Cycle analysis', value: 'cycles' },
  { displayName: 'Path analysis', value: 'paths' }
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
  setup() {
    const currentAnalysis = ref('cycles');
    const cyclesPaths = ref([]) as Ref<any[]>;

    return {
      currentAnalysis,
      cyclesPaths,
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
