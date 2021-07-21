<template>
  <side-panel
    class="analytical-questions-panel-container"
    :tabs="AnalyticalQuestionsTabs"
    :current-tab-name="currentTab"
    :add-padding="true"
    :is-large="false"
    @set-active="setActive"
  >
    <div class="context-insights-container">
      <list-analytical-questions-pane
        @add-question="addNewQuestion" />
    </div>
  </side-panel>
</template>

<script lang="ts">
import SidePanel from '@/components/side-panel/side-panel.vue';
import { defineComponent } from 'vue';
import ListAnalyticalQuestionsPane from '@/components/analytical-questions/list-analytical-questions-pane.vue';

export default defineComponent({
  name: 'AnalyticalQuestionsPanel',
  components: {
    SidePanel,
    ListAnalyticalQuestionsPane
  },
  data: () => ({
    AnalyticalQuestionsTabs: [
      { name: 'Analysis Checklist', icon: 'fa fa-fw fa-question fa-lg' }
    ],
    currentTab: 'Analysis Checklist'
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
  .analytical-questions-panel-container {
    margin-top: 5px;

    .analytical-questions-container {
      margin-left: 1rem;
      margin-right: 1rem;
      overflow: auto;
    }
  }
</style>
