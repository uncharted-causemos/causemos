<template>
  <div>
    <ul
      class="context-insight-controls-container nav navbar-nav navbar-right">
      <li class="nav-item">
        <button
          v-tooltip.top-center="'See a list  of context-specific insights'"
          class="btn context-insight-btn"
          :class="{ 'context-insight-panel-open': isPanelOpen && currentPane === 'list-context-insights' }"
          @click="toggleInsightPane('list-context-insights')"
        >
          <i
            class="fa fa-fw fa-star fa-lg"
          />
          Insights:
          <span class="context-insight-counter">{{ countContextInsights }}</span>
          <i
            class="fa fa-fw"
            :class="isPanelOpen ? 'fa-caret-up' : 'fa-caret-down' "
          />
        </button>
      </li>
    </ul>
    <context-insight-panel :allow-new-context-insights="allowNewContextInsights" />
  </div>
</template>

<script>
// import _ from 'lodash';
import { mapActions, mapGetters, useStore } from 'vuex';

import ContextInsightPanel from '@/components/context-insight-panel/context-insight-panel';

// import API from '@/api/api';
import { getSpecificInsightsCount } from '@/services/insight-service';
import { watchEffect, computed } from 'vue';

export default {
  name: 'ContextInsightControls',
  components: {
    ContextInsightPanel
  },
  computed: {
    ...mapGetters({
      countContextInsights: 'contextInsightPanel/countContextInsights',
      currentPane: 'contextInsightPanel/currentPane',
      isPanelOpen: 'contextInsightPanel/isPanelOpen'
    }),
    allowNewContextInsights() {
      return this.currentView === 'kbExplorer' ||
        this.currentView === 'data' ||
        this.currentView === 'qualitative' ||
        this.currentView === 'quantitative' ||
        this.currentView === 'modelPublishingExperiment'
      ;
    }
  },
  setup() {
    const store = useStore();
    const project = computed(() => store.getters['insightPanel/projectId']);
    const currentView = computed(() => store.getters['app/currentView']);

    // FIXME: refactor into a composable
    watchEffect(onInvalidate => {
      let isCancelled = false;
      async function fetchInsights() {
        const contextId = store.getters['insightPanel/contextId'];
        const insightsCount = await getSpecificInsightsCount(project.value, contextId, currentView.value); // local insights
        if (isCancelled) {
          // Dependencies have changed since the fetch started, so ignore the
          //  fetch results to avoid a race condition.
          return;
        }
        store.dispatch('contextInsightPanel/setCountContextInsights', insightsCount);
      }
      onInvalidate(() => {
        isCancelled = true;
      });
      fetchInsights();
    });
    return {
      currentView,
      project
    };
  },
  methods: {
    ...mapActions({
      showContextInsightPanel: 'contextInsightPanel/showContextInsightPanel',
      hideContextInsightPanel: 'contextInsightPanel/hideContextInsightPanel',
      setCurrentPane: 'contextInsightPanel/setCurrentPane'
    }),
    toggleInsightPane(pane) {
      const paneState = this.isPanelOpen;
      if (paneState) {
        if (this.currentPane === pane) {
          this.hideContextInsightPanel();
          this.setCurrentPane('');
        } else {
          this.setCurrentPane(pane);
        }
      } else {
        this.showContextInsightPanel();
        this.setCurrentPane(pane);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.context-insight-controls-container {
  margin: 0;
}

.context-insight-btn {
  height: $navbar-outer-height;
  background-color: transparent;
  border: transparent;
  color: rgba(255, 255, 255, 0.71);
  .context-insight-counter {
    padding: 5px;
  }

  &:hover {
    color: #FFF;
  }
}

.btn-primary:active,
.btn:focus,
.context-insight-panel-open,
.context-insight-panel-open:hover {
  background-color: $selected;
  color: #FFF;
}

.open {
  color: #f0e442;
}

</style>
