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
        v-if="currentTab === 'Datacube Drawer'" />

      <list-analytical-questions-pane
        v-if="currentTab === 'Analysis Checklist'" />

      <list-context-insight-pane
        v-if="currentTab === 'Context Insights'" />

      <template #below-tabs>
        <slot name="below-tabs" />
      </template>
  </side-panel>
</template>

<script lang="ts">
import SidePanel from '@/components/side-panel/side-panel.vue';
import { computed, defineComponent } from 'vue';
import ListContextInsightPane from '@/components/context-insight-panel/list-context-insight-pane.vue';
import ListAnalyticalQuestionsPane from '@/components/analytical-questions/list-analytical-questions-pane.vue';
import ListDatacubesDrawerPane from '@/components/data/list-datacubes-drawer-pane.vue';
import { useStore } from 'vuex';

export default defineComponent({
  name: 'AnalyticalQuestionsAndInsightsPanel',
  components: {
    SidePanel,
    ListContextInsightPane,
    ListAnalyticalQuestionsPane,
    ListDatacubesDrawerPane
  },
  setup() {
    const store = useStore();
    const currentView = computed(() => store.getters['app/currentView']);

    const tabs = computed(() => {
      if (currentView.value === 'dataComparative') {
        return [
          { name: 'Datacube Drawer', icon: 'fa fa-fw fa-circle fa-lg' },
          { name: 'Analysis Checklist', icon: 'fa fa-fw fa-question fa-lg' },
          { name: 'Context Insights', icon: 'fa fa-fw fa-star fa-lg' }
        ];
      }
      return [
        { name: 'Analysis Checklist', icon: 'fa fa-fw fa-question fa-lg' },
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
    }
  }
});
</script>

<style lang="scss" scoped>
  @import "~styles/variables";

  .analytical-questions-and-insights-panel-container {
    margin-top: 10px;

    .context-insights-container {
      margin-left: 1rem;
      margin-right: 1rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .analytical-questions-container {
      margin-left: 1rem;
      margin-right: 1rem;
      overflow: auto;
    }
  }
</style>
