<template>
  <div class="new-bookmark-pane-container">
    <div class="pane-header">
      <h6>New Insight</h6>
    </div>
    <div class="pane-content">
      <div class="fields">
        <div class="title">
          <i
            :class="iconToDisplay"
          />
          {{ viewName }}
        </div>
        <img :src="imagePreview">
        <form>
          <div class="form-group">
            <label> Title* </label>
            <input
              v-model="title"
              v-focus
              type="text"
              class="form-control"
              placeholder="Untitled insight"
              @keyup.enter.stop="saveBookmark"
            >
            <div
              v-if="hasError === true"
              class="error-msg">
              {{ errorMsg }}
            </div>
            <label>Description</label>
            <textarea
              rows="10"
              v-model="description"
              class="form-control" />
          </div>
        </form>
      </div>
      <div class="metadata">
        <h5>Metadata</h5>
        <div>{{ formattedFilterString() }}</div>
      </div>
    </div>
    <div class="controls">
      <button
        type="button"
        class="btn btn-light"
        @click="closeBookmarkPanel"
      >
        Cancel
      </button>
      <button
        class="btn btn-primary"
        @click="autofillBookmark"
      >
        Autofill
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :class="{ 'disabled': title.length === 0}"
        @click="saveBookmark"
      >
        Save
      </button>
    </div>
  </div>
</template>

<script>
import html2canvas from 'html2canvas';
import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';

import API from '@/api/api';
import FilterValueFormatter from '@/formatters/filter-value-formatter';
import FilterKeyFormatter from '@/formatters/filter-key-formatter';
import modelService from '@/services/model-service';
import { VIEWS_LIST } from '@/utils/views-util';
import { BOOKMARKS } from '@/utils/messages-util';


const MSG_EMPTY_BOOKMARK_TITLE = 'Insight title cannot be blank';


export default {
  name: 'NewBookmarkPane',
  data: () => ({
    title: '',
    description: '',
    hasError: false,
    errorMsg: MSG_EMPTY_BOOKMARK_TITLE,
    imagePreview: null
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentView: 'app/currentView',
      currentCAG: 'app/currentCAG',
      projectMetadata: 'app/projectMetadata',

      currentPane: 'bookmarkPanel/currentPane',
      isPanelOpen: 'bookmarkPanel/isPanelOpen',
      countBookmarks: 'bookmarkPanel/countBookmarks',

      filters: 'dataSearch/filters',
      ontologyConcepts: 'dataSearch/ontologyConcepts',

      view: 'query/view'
    }),
    iconToDisplay() {
      const view = VIEWS_LIST.find(item => item.id === this.currentView);
      return _.isNil(view)
        ? ''
        : view.icon;
    },
    viewName() {
      const view = VIEWS_LIST.find(item => item.id === this.currentView);
      return _.isNil(view)
        ? ''
        : view.name;
    }
  },
  watch: {
    title(n) {
      if (_.isEmpty(n) && this.isPanelOpen) {
        this.hasError = true;
        this.errorMsg = MSG_EMPTY_BOOKMARK_TITLE;
      } else {
        this.hasError = false;
        this.errorMsg = null;
      }
    },
    currentPane() {
      if (this.currentPane !== 'new-bookmark') {
        this.initBookmark();
      }
    }
  },
  methods: {
    ...mapActions({
      hideBookmarkPanel: 'bookmarkPanel/hideBookmarkPanel',
      setCountBookmarks: 'bookmarkPanel/setCountBookmarks',
      setCurrentPane: 'bookmarkPanel/setCurrentPane'
    }),
    closeBookmarkPanel() {
      this.hideBookmarkPanel();
      this.setCurrentPane('');
    },
    formattedFilterString() {
      const filterString = this.filters?.clauses?.reduce((a, c) => {
        return a + `${a.length > 0 ? ' AND ' : ''} ` +
          `${FilterKeyFormatter(c.field)} ${c.isNot ? 'is not' : 'is'} ` +
          `${c.values.map(v => FilterValueFormatter(v)).join(', ')}`;
      }, '');
      return `${filterString.length > 0 ? 'Filters: ' + filterString : ''} `;
    },
    initBookmark() {
      this.title = '';
      this.description = '';
      this.hasError = false;
    },
    async autofillBookmark() {
      this.modelSummary = this.currentCAG ? await modelService.getSummary(this.currentCAG) : null;

      this.title = (this.projectMetadata ? this.projectMetadata.name : '') +
        (this.modelSummary ? (' - ' + this.modelSummary.name) : '') +
        (this.currentView ? (' - ' + this.currentView) : '');

      this.description = this.formattedFilterString();
    },
    async saveBookmark() {
      if (this.hasError || _.isEmpty(this.title)) return;
      const url = this.$route.fullPath;
      API.post('bookmarks', {
        description: this.description,
        project_id: this.project,
        title: this.title,
        thumbnailSource: this.imagePreview,
        url,
        view: this.currentView
      }).then((result) => {
        const message = result.status === 200 ? BOOKMARKS.SUCCESSFUL_ADDITION : BOOKMARKS.ERRONEOUS_ADDITION;
        if (message === BOOKMARKS.SUCCESSFUL_ADDITION) {
          this.toaster(message, 'success', false);
          const count = this.countBookmarks + 1;
          this.setCountBookmarks(count);
        } else {
          this.toaster(message, 'error', true);
        }
        this.hideBookmarkPanel();
        this.initBookmark();
      });
    },
    async takeSnapshot() {
      const el = document.getElementsByClassName('bookmark-capture')[0];
      const image = _.isNil(el) ? null : (await html2canvas(el, { scale: 1 })).toDataURL();
      return image;
    }
  },
  async mounted() {
    this.imagePreview = await this.takeSnapshot();
  }
};
</script>

<style lang="scss">
@import "~styles/variables";

.new-bookmark-pane-container {
  display: flex;
  flex-direction: column;
  height: 100%;

  .pane-content {
    flex: 1 1 auto;
    display: flex;
    flex-direction: row;
    .fields {
      flex: 1 1 auto;
      .title {
        font-size: $font-size-large;
        padding: 10px 0;
      }
      img {
        max-height: 500px;
        margin: 0 0 1em;
      }
      textarea {
        height: 20vh;
        width: 100%;
        box-sizing: border-box;
        resize: none;
        outline: none;
      }
    }
    .metadata {
      margin: 0 0 0 1em;
      flex: 0 1 200px;
      border: 1px solid black;
    }
  }

  .controls {
    flex: 0 1 auto;
    display: flex;
    justify-content: flex-end;
    padding: 1em 0;
    button {
      margin-left: 1em;
    }
  }
}

.error-msg {
  color: $negative;
}

h6 {
  @include header-secondary;
  font-size: $font-size-medium;
}

</style>

