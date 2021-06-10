<template>
  <div class="new-bookmark-pane-container">
    <div class="pane-header">
      <h6>New Insight</h6>
      <close-button @click="closeBookmarkPanel()" />
    </div>
    <div class="pane-title">
      <i
        :class="iconToDisplay"
      />
      {{ viewName }}
    </div>
    <div class="pane-content">
      <form>
        <div class="form-group">
          <label> Name* </label>
          <input
            v-model="name"
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
        :class="{ 'disabled': name.length === 0}"
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
import { INSIGHTS } from '@/utils/messages-util';


const MSG_EMPTY_BOOKMARK_NAME = 'Insight name cannot be blank';

// NOTE: this component is no longer used since new insights are exclusively created via new-insight-modal
export default {
  name: 'NewBookmarkPane',
  components: {
    CloseButton
  },
  data: () => ({
    name: '',
    description: '',
    hasError: false,
    errorMsg: MSG_EMPTY_BOOKMARK_NAME
  }),
  computed: {
    ...mapGetters({
      project: 'insightPanel/projectId',
      currentView: 'app/currentView',
      currentCAG: 'app/currentCAG',
      projectMetadata: 'app/projectMetadata',

      isPanelOpen: 'bookmarkPanel/isPanelOpen',
      countBookmarks: 'bookmarkPanel/countBookmarks',

      dataState: 'insightPanel/dataState',
      viewState: 'insightPanel/viewState',
      publishedModelId: 'insightPanel/publishedModelId',

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
    name(n) {
      if (_.isEmpty(n) && this.isPanelOpen) {
        this.hasError = true;
        this.errorMsg = MSG_EMPTY_BOOKMARK_NAME;
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
      // FIXME: this method may be removed as it wouldn't have any effect since the bookmark panel is always hidden and reinitialized anyway
      this.name = '';
      this.description = '';
      this.hasError = false;
    },
    async autofillBookmark() {
      this.modelSummary = this.currentCAG ? await modelService.getSummary(this.currentCAG) : null;

      this.name = (this.projectMetadata ? this.projectMetadata.name : '') +
        (this.modelSummary ? (' - ' + this.modelSummary.name) : '') +
        (this.currentView ? (' - ' + this.currentView) : '');

      const filterString = this.filters?.clauses?.reduce((a, c) => {
        return a + `${a.length > 0 ? ' AND ' : ''} ` +
          `${FilterKeyFormatter(c.field)} ${c.isNot ? 'is not' : 'is'} ` +
          `${c.values.map(v => FilterValueFormatter(v)).join(', ')}`;
      }, '');
      this.description = `${filterString.length > 0 ? 'Filters: ' + filterString : ''} `;
    },
    async saveBookmark() {
      if (this.hasError || _.isEmpty(this.name)) return;
      const url = this.$route.fullPath;
      // FIXME: ideally this should change according to the view or be passed a target
      // but for now uses a special class to target the capture area
      const el = document.getElementsByClassName('bookmark-capture')[0];
      const thumbnailSource = _.isNil(el) ? null : (await html2canvas(el, { scale: 1 })).toDataURL();
      const modelId = this.publishedModelId;
      const targetView = this.currentView === 'modelPublishingExperiment' ? 'data' : this.currentView;
      const visibility = this.currentView === 'modelPublishingExperiment' ? 'public' : 'private';
      const newInsight = {
        name: this.name,
        description: this.description,
        visibility,
        project_id: this.project,
        model_id: modelId,
        url,
        target_view: targetView,
        pre_actions: null,
        post_actions: null,
        is_default: true,
        analytical_question: '',
        thumbnail: thumbnailSource,
        view_state: this.viewState,
        data_state: this.dataState
      };
      API.post('insights', newInsight)
        .then((result) => {
          const message = result.status === 200 ? INSIGHTS.SUCCESSFUL_ADDITION : INSIGHTS.ERRONEOUS_ADDITION;
          if (message === INSIGHTS.SUCCESSFUL_ADDITION) {
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

.error-msg {
  color: $negative;
}

h6 {
  @include header-secondary;
  font-size: $font-size-medium;
}

</style>

