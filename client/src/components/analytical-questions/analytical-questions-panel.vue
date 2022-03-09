<template>
  <side-panel
    class="analytical-questions-panel-container"
    :tabs="AnalyticalQuestionsTabs"
    :current-tab-name="currentTab"
    :add-padding="true"
    :is-large="true"
    @set-active="setActive"
  >
    <button
      class="btn btn-call-for-action review-button"
      :disabled="!loaded"
      @click="reviewChecklist"
    >
      <i class="fa fa-fw fa-desktop" />
      Review
    </button>
    <list-analytical-questions-pane
      class="analytical-questions-container"
    />
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
  props: {
    loaded: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'review-checklist'
  ],
  data: () => ({
    AnalyticalQuestionsTabs: [
      { name: 'Analysis Checklist', icon: 'fa fa-fw fa-question fa-lg' }
    ],
    currentTab: 'Analysis Checklist'
  }),
  methods: {
    reviewChecklist() {
      this.$emit('review-checklist');
    },
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
      .review-button {
        color: $background-light-1;
        width: 100%;
      }
    .analytical-questions-container {
      overflow-y: auto;
    }
  }
</style>
