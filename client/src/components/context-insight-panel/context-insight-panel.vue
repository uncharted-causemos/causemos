<template>
  <div
    class="context-insight-container"
    :class="{'panel-hidden': !isOpen}"
  >
    <new-context-insight-pane v-if="currentPane === 'new-context-insight'" />
    <list-context-insight-pane v-if="currentPane === 'list-context-insights'" />
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import NewContextInsightPane from '@/components/context-insight-panel/new-context-insight-pane';
import ListContextInsightPane from '@/components/context-insight-panel/list-context-insight-pane';


export default {
  name: 'ContextInsightPanel',
  components: {
    NewContextInsightPane,
    ListContextInsightPane
  },
  props: {
    allowNewContextInsights: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    ...mapGetters({
      isPanelOpen: 'contextInsightPanel/isPanelOpen',
      currentPane: 'contextInsightPanel/currentPane'
    }),
    isOpen() {
      return this.isPanelOpen === true;
    }
  },
  mounted() {
    if (!this.allowNewContextInsights && this.currentPane === 'new-context-insight') {
      this.setCurrentPane('list-context-insights');
    }
  },
  methods: {
    ...mapActions({
      setCurrentPane: 'contextInsightPanel/setCurrentPane'
    })
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.context-insight-container {
  position: absolute;
  display: flex;
  flex-direction: column;
  top: $navbar-outer-height;
  right: 0;
  width: 25vw;
  height: calc(100vh - #{$navbar-outer-height});
  z-index: 600;
  transition: all 0.5s ease;
  padding: 0 10px;
  background: $background-light-1;
  box-shadow: 0 2px 2px rgba(0,0,0,.12), 0 4px 4px rgba(0,0,0,.24);
  overflow-y: auto;
  overflow-x: hidden;
  word-wrap: break-word;
  color: #707070;
}

.context-insight-container.panel-hidden {
  display: none;
}

::v-deep(.pane-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
}
</style>

