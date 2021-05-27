<template>
  <div>
    <ul
      class="bookmark-controls-container nav navbar-nav navbar-right">
      <li class="nav-item">
        <button
          v-tooltip.top-center="'See insights list'"
          class="btn bookmark-btn"
          :class="{ 'bookmark-panel-open': isPanelOpen && currentPane === 'list-bookmarks' }"
          @click="openBookmarkPane('list-bookmarks')"
        >
          <i
            class="fa fa-fw fa-star fa-lg"
          />
          Insights:
          <span class="bookmark-counter">{{ countBookmarks }}</span>
          <i
            class="fa fa-fw fa-caret-down"
          />
        </button>
      </li>
      <li
        v-if="allowNewBookmarks"
        class="nav-item"
      >
        <button
          v-tooltip.top-center="'Save insight'"
          class="btn bookmark-btn"
          :class="{ 'bookmark-panel-open': isPanelOpen && currentPane ==='new-bookmark' }"
          @click="openBookmarkPane('new-bookmark')"
        >
          <i
            class="fa fa-fw fa-lg"
            :class="{
              'fa-star-o': currentPane !== 'new-bookmark',
              'fa-star open': currentPane === 'new-bookmark'
            }"
          />
        </button>
      </li>
    </ul>
    <bookmark-panel :allow-new-bookmarks="allowNewBookmarks" />
  </div>
</template>

<script>
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';

import BookmarkPanel from '@/components/bookmark-panel/bookmark-panel';

import API from '@/api/api';

export default {
  name: 'BookmarkControls',
  components: {
    BookmarkPanel
  },
  computed: {
    ...mapGetters({
      countBookmarks: 'bookmarkPanel/countBookmarks',
      currentPane: 'bookmarkPanel/currentPane',
      isPanelOpen: 'bookmarkPanel/isPanelOpen',
      currentView: 'app/currentView',
      project: 'app/project'
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
      showBookmarkPanel: 'bookmarkPanel/showBookmarkPanel',
      setCurrentPane: 'bookmarkPanel/setCurrentPane',
      setCountBookmarks: 'bookmarkPanel/setCountBookmarks'
    }),
    openBookmarkPane(pane) {
      this.showBookmarkPanel();
      this.setCurrentPane(pane);
    },
    refresh() {
      // FIXME: currently, the insight feature is dependent on an active "project"
      //        but this needs to be revised since insight saved during model publishing won't have a project association
      API.get('bookmarks/counts', {
        params: { project_id: this.project }
      }).then(d => {
        this.setCountBookmarks(d.data);
      });
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
