<template>
  <side-panel
    class="analytical-questions-and-insights-panel-container"
    :tabs="tabs"
    :current-tab-name="currentTab"
    :add-padding="true"
    :is-large="false"
    @set-active="setActive"
  >
      <list-analytical-questions-pane
        v-if="currentTab === 'Analysis Checklist'" />

      <list-context-insight-pane
        v-if="currentTab === 'Context Insights'" />
  </side-panel>
</template>

<script lang="ts">
import SidePanel from '@/components/side-panel/side-panel.vue';
import { defineComponent } from 'vue';
import ListContextInsightPane from '@/components/context-insight-panel/list-context-insight-pane.vue';
import ListAnalyticalQuestionsPane from '@/components/analytical-questions/list-analytical-questions-pane.vue';
import { mapActions } from 'vuex';

export default defineComponent({
  name: 'AnalyticalQuestionsAndInsightsPanel',
  components: {
    SidePanel,
    ListContextInsightPane,
    ListAnalyticalQuestionsPane
  },
  data: () => ({
    tabs: [
      { name: 'Analysis Checklist', icon: 'fa fa-fw fa-question fa-lg' },
      { name: 'Context Insights', icon: 'fa fa-fw fa-star fa-lg' }
    ],
    currentTab: ''
  }),
  methods: {
    ...mapActions({
    }),
    setActive(tab: string) {
      this.currentTab = tab;
    }
  }
});
</script>

<style lang="scss" scoped>
  @import "~styles/variables";

  .analytical-questions-and-insights-panel-container {
    margin-top: 5px;

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
