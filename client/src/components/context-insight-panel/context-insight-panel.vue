<template>
  <side-panel
    class="context-insights-panel-container"
    :tabs="ContextInsightsTabs"
    :current-tab-name="currentTab"
    :add-padding="false"
    :is-large="false"
    @set-active="setActive"
  >
    <div class="context-insights-container">
      <list-context-insight-pane />
    </div>
  </side-panel>
</template>

<script lang="ts">
import SidePanel from '@/components/side-panel/side-panel.vue';
import { defineComponent } from 'vue';
import ListContextInsightPane from '@/components/context-insight-panel/list-context-insight-pane.vue';

export default defineComponent({
  name: 'ContextInsightPanel',
  components: {
    SidePanel,
    ListContextInsightPane
  },
  data: () => ({
    ContextInsightsTabs: [
      { name: 'Context Insights', icon: 'fa fa-fw fa-star fa-lg' }
    ],
    currentTab: '' // start with panel collapsed
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

  .context-insights-panel-container {
    margin-top: 1rem;
    .context-insights-container {
      margin-left: 1rem;
      margin-right: 1rem;
      overflow: auto;
    }
  }
</style>
