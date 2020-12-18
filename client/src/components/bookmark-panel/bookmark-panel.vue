<template>
  <div
    class="bookmark-container"
    :class="{'panel-hidden': !isOpen}"
  >
    <new-bookmark-pane v-if="currentPane === 'new-bookmark'" />
    <list-bookmarks-pane v-if="currentPane === 'list-bookmarks'" />
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import NewBookmarkPane from '@/components/bookmark-panel/new-bookmark-pane';
import ListBookmarksPane from '@/components/bookmark-panel/list-bookmarks-pane';


export default {
  name: 'BookmarkPanel',
  components: {
    NewBookmarkPane,
    ListBookmarksPane
  },
  props: {
    allowNewBookmarks: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    ...mapGetters({
      isPanelOpen: 'bookmarkPanel/isPanelOpen',
      currentPane: 'bookmarkPanel/currentPane'
    }),
    isOpen() {
      return this.isPanelOpen === true;
    }
  },
  mounted() {
    if (!this.allowNewBookmarks && this.currentPane === 'new-bookmark') {
      this.setCurrentPane('list-bookmarks');
    }
  },
  methods: {
    ...mapActions({
      setCurrentPane: 'bookmarkPanel/setCurrentPane'
    })
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/wm-theme/wm-theme";
@import "~styles/variables";

.bookmark-container {
  position: absolute;
  display: flex;
  flex-direction: column;
  top: $navbar-outer-height;
  right: 0;
  width: $bookmark-panel-width;
  height: calc(100vh - #{$navbar-outer-height});
  z-index: map-get($z-index-order, bookmark-panel);
  transition: all 0.5s ease;
  padding: 0 10px;
  background: $color-background-lvl-2;
  box-shadow: 0 2px 2px rgba(0,0,0,.12), 0 4px 4px rgba(0,0,0,.24);
  overflow-y: auto;
  overflow-x: hidden;
  word-wrap: break-word;
}

.bookmark-container.panel-hidden {
  display: none;
}

/deep/ .pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
}

/deep/ .pane-title {
  padding: 10px 0;
}
</style>

