<template>
  <div>
    <ul
      class="bookmark-controls-container nav navbar-nav navbar-right">
      <li class="nav-item">
        <button
          v-tooltip.top-center="'See a list  of context-specific insights'"
          class="btn bookmark-btn"
          :class="{ 'bookmark-panel-open': isPanelOpen && currentPane === 'list-bookmarks' }"
          @click="toggleInsightPane('list-bookmarks')"
        >
          <i
            class="fa fa-fw fa-star fa-lg"
          />
          Insights:
          <span class="bookmark-counter">{{ countBookmarks }}</span>
          <i
            class="fa fa-fw"
            :class="isPanelOpen ? 'fa-caret-up' : 'fa-caret-down' "
          />
        </button>
      </li>
    </ul>
    <bookmark-panel :allow-new-bookmarks="allowNewBookmarks" />
  </div>
</template>

<script>
// import _ from 'lodash';
import { mapActions, mapGetters, useStore } from 'vuex';

import BookmarkPanel from '@/components/bookmark-panel/bookmark-panel';

// import API from '@/api/api';
import { getSpecificInsightsCount } from '@/services/insight-service';
import { watchEffect, computed } from 'vue';

export default {
  name: 'BookmarkControls',
  components: {
    BookmarkPanel
  },
  computed: {
    ...mapGetters({
      countBookmarks: 'bookmarkPanel/countBookmarks',
      currentPane: 'bookmarkPanel/currentPane',
      isPanelOpen: 'bookmarkPanel/isPanelOpen'
    }),
    allowNewBookmarks() {
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
        store.dispatch('bookmarkPanel/setCountBookmarks', insightsCount);
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
      showBookmarkPanel: 'bookmarkPanel/showBookmarkPanel',
      hideBookmarkPanel: 'bookmarkPanel/hideBookmarkPanel',
      setCurrentPane: 'bookmarkPanel/setCurrentPane'
    }),
    toggleInsightPane(pane) {
      const paneState = this.isPanelOpen;
      if (paneState) {
        if (this.currentPane === pane) {
          this.hideBookmarkPanel();
          this.setCurrentPane('');
        } else {
          this.setCurrentPane(pane);
        }
      } else {
        this.showBookmarkPanel();
        this.setCurrentPane(pane);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.bookmark-controls-container {
  margin: 0;
}

.bookmark-btn {
  height: $navbar-outer-height;
  background-color: transparent;
  border: transparent;
  color: rgba(255, 255, 255, 0.71);
  .bookmark-counter {
    padding: 5px;
  }

  &:hover {
    color: #FFF;
  }
}

.btn-primary:active,
.btn:focus,
.bookmark-panel-open,
.bookmark-panel-open:hover {
  background-color: $selected;
  color: #FFF;
}

.open {
  color: #f0e442;
}

</style>
