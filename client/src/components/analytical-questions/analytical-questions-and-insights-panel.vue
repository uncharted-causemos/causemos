<template>
  <side-panel
    class="analytical-questions-and-insights-panel-container"
    :tabs="tabs"
    :current-tab-name="currentTab"
    :add-padding="true"
    :is-large="false"
    @set-active="setActive"
  >
    <div v-if="currentTab === 'Analysis Checklist'" >
      <list-analytical-questions-pane
        @add-question="addNewQuestion" />
    </div>

    <div v-if="currentTab === 'Context Insights'" class="context-insights-container">
      <button
        type="button"
        class="btn btn-primary btn-call-for-action"
        style="padding: 2px;"
        @click.stop="newInsight">
          <i class="fa fa-fw fa-star fa-lg" />
          New Insight
      </button>
      <list-context-insight-pane />
    </div>
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
      showInsightPanel: 'insightPanel/showInsightPanel',
      setCurrentPane: 'insightPanel/setCurrentPane'
    }),
    setActive(tab: string) {
      this.currentTab = tab;
    },
    newInsight() {
      this.showInsightPanel();
      this.setCurrentPane('new-insight');
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
      overflow: auto;
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
