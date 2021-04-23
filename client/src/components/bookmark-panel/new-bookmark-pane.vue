<template>
  <div class="new-bookmark-pane-container">
    <div class="pane-header">
      <h6>New Insight</h6>
      <close-button @click="closeBookmarkPanel()" />
    </div>
    <hr class="pane-separator">
    <div class="pane-title">
      <i
        :class="iconToDisplay"
      />
      {{ viewName }}
    </div>
    <div class="pane-content">
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
import CloseButton from '@/components/widgets/close-button';
import FilterValueFormatter from '@/formatters/filter-value-formatter';
import FilterKeyFormatter from '@/formatters/filter-key-formatter';
import modelService from '@/services/model-service';
import { VIEWS_LIST } from '@/utils/views-util';
import { BOOKMARKS } from '@/utils/messages-util';


const MSG_EMPTY_BOOKMARK_TITLE = 'Insight title cannot be blank';


export default {
  name: 'NewBookmarkPane',
  components: {
    CloseButton
  },
  data: () => ({
    title: '',
    description: '',
    hasError: false,
    errorMsg: MSG_EMPTY_BOOKMARK_TITLE
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentView: 'app/currentView',
      currentCAG: 'app/currentCAG',
      projectMetadata: 'app/projectMetadata',

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
    }
  },
  methods: {
    ...mapActions({
      hideBookmarkPanel: 'bookmarkPanel/hideBookmarkPanel',
      setCountBookmarks: 'bookmarkPanel/setCountBookmarks',
      setCurrentPane: 'bookmarkPanel/setCurrentPane'
    }),
    initBookmark() {
      this.title = '';
      this.description = '';
      this.hasError = false;
    },
    async autofillBookmark() {
      this.modelSummary = this.currentCAG ? await modelService.getSummary(this.currentCAG) : null;

      this.title = (this.projectMetadata ? this.projectMetadata.name : '') +
        (this.modelSummary ? (' - ' + this.modelSummary.name) : '') +
        (this.view ? (' - ' + this.view) : '');

      const filterString = this.filters?.clauses?.reduce((a, c) => {
        return a + `${a.length > 0 ? ' OR ' : ''} ` +
          `${FilterKeyFormatter(c.field)} ${c.isNot ? 'is not' : 'is'} ` +
          `${c.values.map(v => FilterValueFormatter(v)).join(', ')}`;
      }, '');
      this.description = `${filterString.length > 0 ? 'Filters: ' + filterString : ''} `;
      console.log(this.filters, this.ontologyConcepts, this.projectMetadata, this.modelSummary);
    },
    async saveBookmark() {
      if (this.hasError || _.isEmpty(this.title)) return;
      const url = this.$route.fullPath;
      // FIXME: ideally this should change according to the view or be passed a target
      // but for now uses a special class to target the capture area
      const el = document.getElementsByClassName('bookmark-capture')[0];
      const thumbnailSource = _.isNil(el) ? null : (await html2canvas(el, { scale: 1 })).toDataURL();
      API.post('bookmarks', { project_id: this.project, title: this.title, description: this.description, view: this.currentView, url, thumbnailSource })
        .then((result) => {
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
    closeBookmarkPanel() {
      this.hideBookmarkPanel();
      this.setCurrentPane('');
      this.initBookmark();
    }
  }
};
</script>

<style lang="scss">
@import "~styles/variables";

.new-bookmark-pane-container {
  .controls {
    display: flex;
    justify-content: flex-end;

    button {
      margin-left: 10px;
    }
  }

  textarea {
    height: 45vh;
    width: 100%;
    box-sizing: border-box;
    resize: none;
    outline: none;
  }

  .pane-title {
    font-size: $font-size-large;
    padding: 10px 0;
  }
}

</style>

