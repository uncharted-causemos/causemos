<template>
  <ul class="insight-controls-container nav navbar-nav navbar-right">
    <li class="nav-item">
      <button
        v-tooltip.top-center="'See a list of all insights'"
        class="btn insight-btn"
        :class="{ 'insight-manager-open': isPanelOpen && currentPane === 'list-insights' }"
        @click="toggleInsightPane('list-insights')"
      >
        <i
          class="fa fa-fw fa-star fa-lg"
        />
        All Insights:
        <span class="insight-counter">{{ countInsights }}</span>
        <i
          class="fa fa-fw"
          :class="isPanelOpen ? 'fa-caret-up' : 'fa-caret-down' "
        />
      </button>
    </li>
    <li
      v-if="allowNewInsights"
      class="nav-item"
    >
      <button
        v-tooltip.top-center="'Save insight'"
        class="btn insight-btn"
        :class="{ 'insight-manager-open': isPanelOpen && currentPane ==='new-insight' }"
        @click="toggleInsightPane('new-insight')"
      >
        <i
          class="fa fa-fw fa-lg"
          :class="{
            'fa-star-o': currentPane !== 'new-insight',
            'fa-star open': currentPane === 'new-insight'
          }"
        />
      </button>
    </li>
  </ul>
</template>

<script>
import { mapActions, mapGetters, useStore } from 'vuex';
import { getAllInsightsCount } from '@/services/insight-service';
import { watchEffect, computed } from 'vue';

export default {
  name: 'InsightControlsMenu',
  computed: {
    ...mapGetters({
      countInsights: 'insightPanel/countInsights',
      currentPane: 'insightPanel/currentPane',
      isPanelOpen: 'insightPanel/isPanelOpen',
      currentView: 'app/currentView'
    })
  },
  setup() {
    const store = useStore();
    const project = computed(() => store.getters['insightPanel/projectId']);

    // FIXME: refactor into a composable
    watchEffect(onInvalidate => {
      let isCancelled = false;
      async function fetchInsights() {
        // @REVIEW @FIXME: when contextId was a computed property it didn't return an updated value when the store value was changed
        const contextId = store.getters['insightPanel/contextId'];
        // all insights count = project-insights count + context (i.e., datacube-id, cag-id) insights count
        const allInsightsCount = await getAllInsightsCount(project.value, contextId);
        if (isCancelled) {
          // Dependencies have changed since the fetch started, so ignore the
          //  fetch results to avoid a race condition.
          return;
        }
        store.dispatch('insightPanel/setCountInsights', allInsightsCount);
      }
      onInvalidate(() => {
        isCancelled = true;
      });
      fetchInsights();
    });
    return {
    };
  },
  methods: {
    ...mapActions({
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      showInsightPanel: 'insightPanel/showInsightPanel',
      setCountInsights: 'insightPanel/setCountInsights',
      setCurrentPane: 'insightPanel/setCurrentPane',
      hideContextInsightPanel: 'contextInsightPanel/hideContextInsightPanel'
    }),
    allowNewInsights() {
      return this.currentView === 'kbExplorer' ||
        this.currentView === 'data' ||
        this.currentView === 'qualitative' ||
        this.currentView === 'quantitative' ||
        this.currentView === 'modelPublishingExperiment';
    },
    toggleInsightPane(pane) {
      const paneState = this.isPanelOpen;
      if (paneState) {
        if (this.currentPane === pane) {
          this.hideInsightPanel();
          this.setCurrentPane('');
        } else {
          this.setCurrentPane(pane);
        }
      } else {
        this.showInsightPanel();
        this.setCurrentPane(pane);
        // hide the local insight panel
        this.hideContextInsightPanel();
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.insight-controls-container {
  margin: 0;
}

.insight-btn {
  height: $navbar-outer-height;
  background-color: transparent;
  border: transparent;
  color: rgba(255, 255, 255, 0.71);
  .insight-counter {
    padding: 5px;
  }

  &:hover {
    color: #FFF;
  }
}

.insight-manager-open,
.insight-manager-open:hover {
  background-color: $selected;
  color: #FFF;
}

.btn-primary:active,
.btn:focus {
  color: #FFF;
}


.open {
  color: #f0e442;
}

</style>
