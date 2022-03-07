<template>
  <div
    class="insight-container"
    :class="{'panel-hidden': !isOpen}"
  >
    <review-insight-modal v-if="currentPane === 'review-insight'" />
    <review-insight-modal :edit-mode="true" v-if="currentPane === 'review-edit-insight'" />
    <review-insight-modal :new-mode="true" v-if="currentPane === 'review-new-insight'" />
    <list-insights-modal v-if="isOpen && currentPane === 'list-insights'" />
  </div>
</template>

<script lang="ts">
import { useStore } from 'vuex';
import { defineComponent, computed } from 'vue';
import ListInsightsModal from '@/components/insight-manager/list-insights-modal.vue';
import ReviewInsightModal from '@/components/insight-manager/review-insight-modal.vue';


export default defineComponent({
  name: 'InsightManager',
  components: {
    ListInsightsModal,
    ReviewInsightModal
  },
  setup() {
    const store = useStore();
    const isPanelOpen = computed(() => store.getters['insightPanel/isPanelOpen']);
    const currentPane = computed(() => store.getters['insightPanel/currentPane']);

    const isOpen = computed(() => {
      return isPanelOpen.value === true;
    });

    return {
      isPanelOpen,
      currentPane,
      isOpen
    };
  }
});
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

