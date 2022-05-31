<template>
  <side-panel
    class="analytical-questions-and-insights-panel-container"
    :tabs="tabs"
    :current-tab-name="currentTab"
    :add-padding="true"
    :is-large="false"
    @set-active="setActive"
  >
      <list-datacubes-drawer-pane
        v-if="currentTab === 'Available datacubes'"
        :analysis-items="analysisItems"
        @remove-analysis-item="removeAnalysisItem"
        @toggle-analysis-item-selected="toggleAnalysisItemSelected"
      />

      <list-context-insight-pane
        v-if="currentTab === 'Context Insights'" />

      <template #below-tabs>
        <slot name="below-tabs" />
      </template>
  </side-panel>
</template>

<script lang="ts">
import SidePanel from '@/components/side-panel/side-panel.vue';
import { computed, defineComponent, PropType } from 'vue';
import ListContextInsightPane from '@/components/context-insight-panel/list-context-insight-pane.vue';
import ListDatacubesDrawerPane from '@/components/data/list-datacubes-drawer-pane.vue';
import { useStore } from 'vuex';
import { AnalysisItem } from '@/types/Analysis';

export default defineComponent({
  name: 'AnalyticalQuestionsAndInsightsPanel',
  components: {
    SidePanel,
    ListContextInsightPane,
    ListDatacubesDrawerPane
  },
  props: {
    analysisItems: {
      type: Array as PropType<AnalysisItem[]>,
      default: () => []
    }
  },
  setup() {
    const store = useStore();
    const currentView = computed(() => store.getters['app/currentView']);

    const tabs = computed(() => {
      if (currentView.value === 'dataComparative') {
        return [
          { name: 'Available datacubes', icon: 'fa fa-fw fa-circle fa-lg' },
          // { name: 'Analysis Checklist', icon: 'fa fa-fw fa-question fa-lg' },
          { name: 'Context Insights', icon: 'fa fa-fw fa-star fa-lg' }
        ];
      }
      return [
        // { name: 'Analysis Checklist', icon: 'fa fa-fw fa-question fa-lg' },
        { name: 'Context Insights', icon: 'fa fa-fw fa-star fa-lg' }
      ];
    });

    return {
      tabs
    };
  },
  data: () => ({
    currentTab: ''
  }),
  methods: {
    setActive(tab: string) {
      this.currentTab = tab;
    },
    toggleAnalysisItemSelected(itemId: string) {
      this.$emit('toggle-analysis-item-selected', itemId);
    },
    removeAnalysisItem(itemId: string) {
      this.$emit('remove-analysis-item', itemId);
    }
  }
});
</script>

<style lang="scss" scoped>
  @import "~styles/variables";

  .analytical-questions-and-insights-panel-container {
    margin-top: 10px;
  }
</style>
