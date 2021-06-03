<template>
  <div class="new-insight-pane-container">
    <div class="pane-header">
      <h6>New Insight</h6>
    </div>
    <div class="pane-content" v-if="imagePreview !== null">
      <div
        v-if="hasError === true"
        class="error-msg">
        {{ errorMsg }}
      </div>
      <div class="fields">
        <div class="preview">
          <img :src="imagePreview">
        </div>
        <div class="form-group">
          <form>
            <label> Title* </label>
            <input
              v-model="title"
              v-focus
              type="text"
              class="form-control"
              placeholder="Untitled insight"
              @keyup.enter.stop="saveInsight"
            >
            <label>Description</label>
            <textarea
              rows="10"
              v-model="description"
              class="form-control" />
          </form>
        </div>
      </div>
      <div class="metadata">
        <h5>Metadata</h5>
        <div class="title">
          <i
            :class="iconToDisplay"
          />
          {{ viewName }}
        </div>
        <div>{{ formattedFilterString() }}</div>
      </div>
    </div>
    <div class="controls">
      <button
        type="button"
        class="btn btn-light"
        @click="closeInsightPanel"
      >
        Cancel
      </button>
      <button
        class="btn btn-primary"
        @click="autofillInsight"
      >
        Autofill
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :class="{ 'disabled': title.length === 0}"
        @click="saveInsight"
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
  name: 'NewInsightPane',
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

      currentPane: 'insightPanel/currentPane',
      isPanelOpen: 'insightPanel/isPanelOpen',
      countInsights: 'insightPanel/countInsights',

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
      if (this.currentPane !== 'new-insight') {
        this.initInsight();
      }
    }
  },
  methods: {
    ...mapActions({
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      setCountInsights: 'insightPanel/setCountInsights',
      setCurrentPane: 'insightPanel/setCurrentPane'
    }),
    closeInsightPanel() {
      this.hideInsightPanel();
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
    initInsight() {
      this.title = '';
      this.description = '';
      this.hasError = false;
    },
    async autofillInsight() {
      this.modelSummary = this.currentCAG ? await modelService.getSummary(this.currentCAG) : null;

      this.title = (this.projectMetadata ? this.projectMetadata.name : '') +
        (this.modelSummary ? (' - ' + this.modelSummary.name) : '') +
        (this.currentView ? (' - ' + this.currentView) : '');

      this.description = this.formattedFilterString();
    },
    async saveInsight() {
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
          const count = this.countInsights + 1;
          this.setCountInsights(count);
        } else {
          this.toaster(message, 'error', true);
        }
        this.hideInsightPanel();
        this.initInsight();
      });
    },
    async takeSnapshot() {
      const el = document.getElementsByClassName('insight-capture')[0];
      const image = _.isNil(el) ? null : (await html2canvas(el, { scale: 1 })).toDataURL();
      return image;
    }
  },
  async mounted() {
    this.imagePreview = await this.takeSnapshot();
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.new-insight-pane-container {
  display: flex;
  flex-direction: column;
  height: 100%;

  .pane-content {
    flex: 1 1 auto;
    display: flex;
    flex-direction: row;
    .fields {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      .preview {
        height: calc(58vh - #{$navbar-outer-height});;
        margin: 0 0 1em;
        overflow: hidden;
        img {
          max-height: 100%;
        }
      }
      .form-group {
        height: calc(30vh - #{$navbar-outer-height});
        form {
          display: flex;
          flex-direction: column;
          width: 100%;
          textarea {
            flex: 1 1 auto;
            resize: none;
            outline: none;
            box-sizing: border-box;
          }
        }
      }
    }
    .metadata {
      margin: 0 0 0 1em;
      flex: 0 1 400px;
      border: 1px solid black;
      background-color: $background-light-1;
      .title {
        font-size: $font-size-large;
      }
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

