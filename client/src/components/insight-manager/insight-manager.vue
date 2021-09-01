<template>
  <div
    class="insight-container"
    :class="{'panel-hidden': !isOpen}"
  >
    <new-insight-modal v-if="currentPane === 'new-insight'" />
    <edit-insight-modal v-if="currentPane === 'edit-insight'" />
    <list-insights-modal v-if="currentPane === 'list-insights'" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import NewInsightModal from '@/components/insight-manager/new-insight-modal';
import ListInsightsModal from '@/components/insight-manager/list-insights-modal';
import EditInsightModal from '@/components/insight-manager/edit-insight-modal';


export default {
  name: 'InsightManager',
  components: {
    NewInsightModal,
    ListInsightsModal,
    EditInsightModal
  },
  computed: {
    ...mapGetters({
      isPanelOpen: 'insightPanel/isPanelOpen',
      currentPane: 'insightPanel/currentPane'
    }),
    isOpen() {
      return this.isPanelOpen === true;
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.insight-container {
  position: absolute;
  display: flex;
  flex-direction: column;
  top: 0;
  right: 0;
  width: 100%;
  height: 100vh;
  z-index: 600;
  transition: all 0.5s ease;
  padding: 0;
  background-color: $background-light-3;
  box-shadow: 0 2px 2px rgba(0,0,0,.12), 0 4px 4px rgba(0,0,0,.24);
  overflow-y: auto;
  overflow-x: hidden;
  word-wrap: break-word;
  color: #707070;
}

.insight-container.panel-hidden {
  display: none;
}

::v-deep(.pane-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
}
</style>

