<template>
  <div class="list-bookmarks-pane-container">
    <div class="pane-header">
      <h6>Saved Insights</h6>
      <close-button @click="closeBookmarkPanel()" />
    </div>
    <div
      v-if="listBookmarks.length > 0"
      class="pane-content">
      <div
        v-for="bookmark in listBookmarks"
        :key="bookmark.id">
        <div
          class="bookmark"
          :class="{ 'selected': selectedBookmark === bookmark, '': selectedBookmark !== bookmark }"
          @click="selectBookmark(bookmark)">
          <div class="bookmark-header">
            <div class="bookmark-title">
              <i :class="formattedViewIcon(bookmark.view)" />
              {{ stringFormatter(bookmark.title, 25) }}
            </div>
            <div @click.stop="openEditor(bookmark.id)">
              <i class="fa fa-ellipsis-h bookmark-header-btn" />
              <bookmark-editor
                v-if="activeBookmark === bookmark.id"
                @delete="deleteBookmark(bookmark.id)"
              />
            </div>
          </div>
          <div
            class="bookmark-content">
            <div class="bookmark-thumbnail">
              <img
                :src="bookmark.thumbnail_source"
                class="thumbnail">
            </div>
            <div
              v-if="bookmark.description.length > 0"
              class="bookmark-description">
              {{ bookmark.description }}
            </div>
            <div
              v-else
              class="bookmark-empty-description">No description provided</div>
          </div>
        </div>
      </div>
    </div>
    <message-display
      v-else
      :message="messageNoData"
    />
  </div>
</template>

<script>
import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';
import API from '@/api/api';

import { VIEWS_LIST } from '@/utils/views-util';
import { BOOKMARKS } from '@/utils/messages-util';

import BookmarkEditor from '@/components/bookmark-panel/bookmark-editor';
import CloseButton from '@/components/widgets/close-button';
import MessageDisplay from '@/components/widgets/message-display';
import stringFormatter from '@/formatters/string-formatter';

export default {
  name: 'ListBookmarksPane',
  components: {
    BookmarkEditor,
    CloseButton,
    MessageDisplay
  },
  data: () => ({
    listBookmarks: [],
    activeBookmark: null,
    selectedBookmark: null,
    messageNoData: BOOKMARKS.NO_DATA
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentView: 'app/currentView',
      countBookmarks: 'bookmarkPanel/countBookmarks'
    })
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      hideBookmarkPanel: 'bookmarkPanel/hideBookmarkPanel',
      setCountBookmarks: 'bookmarkPanel/setCountBookmarks'
    }),
    stringFormatter,
    refresh() {
      API.get('bookmarks', { params: { project_id: this.project } }).then(d => {
        const listBookmarks = _.orderBy(d.data, d => d.modified_at, ['desc']);
        this.listBookmarks = listBookmarks;
        this.setCountBookmarks(listBookmarks.length);
      });
    },
    formattedViewName(view) {
      return VIEWS_LIST.find(item => item.id === view).name;
    },
    formattedViewIcon(view) {
      return VIEWS_LIST.find(item => item.id === view).icon;
    },
    openEditor(id) {
      if (id === this.activeBookmark) {
        this.activeBookmark = null;
        return;
      }
      this.activeBookmark = id;
    },
    closeBookmarkPanel() {
      this.hideBookmarkPanel();
      this.activeBookmark = null;
      this.selectedBookmark = null;
    },
    selectBookmark(bookmark) {
      if (bookmark === this.selectedBookmark) {
        this.selectedBookmark = null;
        return;
      }
      this.selectedBookmark = bookmark;
      // Restore the state
      const savedURL = bookmark.url;
      const currentURL = this.$route.fullPath;
      if (savedURL !== currentURL) {
        this.$router.push(savedURL);
      }
    },
    deleteBookmark(id) {
      API.delete(`bookmarks/${id}`).then(result => {
        const message = result.status === 200 ? BOOKMARKS.SUCCESSFUL_REMOVAL : BOOKMARKS.ERRONEOUS_REMOVAL;
        if (message === BOOKMARKS.SUCCESSFUL_REMOVAL) {
          this.toaster(message, 'success', false);
          const count = this.countBookmarks - 1;
          this.setCountBookmarks(count);
          this.refresh();
        } else {
          this.toaster(message, 'error', true);
        }
      });
    }
  }
};
</script>

<style lang="scss">
@import "~styles/variables";
.list-bookmarks-pane-container {

  .bookmark {
    cursor: pointer;
    padding: 5px 5px 10px;
    border-bottom: 1px solid #e5e5e5;
    .bookmark-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .bookmark-header-btn {
        cursor: pointer;
        padding: 5px;
        color: gray;
      }
    }
      .bookmark-title {
        font-weight: bold;
        color: #707070;
      }
      .bookmark-empty-description {
        color: #D6DBDF;
      }
      .bookmark-thumbnail {
        .thumbnail {
          width:  100%;
          min-height: 100px;
        }
      }

  }
  .selected {
    border: 3px solid $selected;
  }
}

</style>
