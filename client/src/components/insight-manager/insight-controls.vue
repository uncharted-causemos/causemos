<template>
  <div>
    <ul
      class="insight-controls-container nav navbar-nav navbar-right">
      <li class="nav-item">
        <button
          v-tooltip.top-center="'See insights list'"
          class="btn insight-btn"
          :class="{ 'insight-manager-open': isPanelOpen && currentPane === 'list-insights' }"
          @click="toggleInsightPane('list-insights')"
        >
          <i
            class="fa fa-fw fa-star fa-lg"
          />
          Insights:
          <span class="insight-counter">{{ countInsights }}</span>
          <i
            class="fa fa-fw fa-caret-down"
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
    <insight-manager :allow-new-insights="allowNewInsights" />
  </div>
</template>

<script>
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';

import InsightManager from '@/components/insight-manager/insight-manager';

import API from '@/api/api';

export default {
  name: 'InsightControls',
  components: {
    InsightManager
  },
  computed: {
    ...mapGetters({
      countInsights: 'insightPanel/countInsights',
      currentPane: 'insightPanel/currentPane',
      isPanelOpen: 'insightPanel/isPanelOpen',
      currentView: 'app/currentView',
      project: 'app/project'
    }),
    allowNewInsights() {
      return this.currentView === 'kbExplorer' ||
        this.currentView === 'data' ||
        this.currentView === 'qualitative' ||
        this.currentView === 'quantitative' ||
        this.currentView === 'modelPublishingExperiment'
      ;
    }
  },
  watch: {
    collection(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      currentPane: 'insightPanel/currentPane',
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      isPanelOpen: 'insightPanel/isPanelOpen',
      showInsightPanel: 'insightPanel/showInsightPanel',
      setCountInsights: 'insightPanel/setCountInsights',
      setCurrentPane: 'insightPanel/setCurrentPane'
    }),
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
      }
    },
    refresh() {
      // FIXME: currently, the insight feature is dependent on an active "project"
      //        but this needs to be revised since insight saved during model publishing won't have a project association
      API.get('bookmarks/counts', {
        params: { project_id: this.project }
      }).then(d => {
        this.setCountInsights(d.data);
      });
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
