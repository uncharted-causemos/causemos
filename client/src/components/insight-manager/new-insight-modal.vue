<template>
  <div class="new-insight-modal-container">
    <full-screen-modal-header>
      <h5>New Insight</h5>
    </full-screen-modal-header>
    <div class="pane-wrapper">
      <div class="pane-row" v-if="imagePreview !== null">
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
              <div
                v-if="hasError === true"
                class="error-msg">
                {{ errorMsg }}
              </div>
              <label>Description</label>
              <textarea
                rows="5"
                v-model="description"
                class="form-control" />
            </form>
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

        <drilldown-panel
          class="metadata-drilldown-panel"
          is-open
          :tabs="drilldownTabs"
          :activeTabId="drilldownTabs[0].id"
          only-display-icons
        >
          <template #content>
            <div>
              <ul>
                <li>
                  <i :class="iconToDisplay" /> {{ viewName }}
                </li>
                <li>
                  <b>Project Name:</b> {{ projectMetadata.name }}
                </li>
                <li>
                  <b>Ontology:</b> {{ projectMetadata.ontology }}
                </li>
                <li>
                  <b>Created:</b> {{ projectMetadata.created_at }}
                </li>
                <li>
                  <b>Modifed:</b> {{ projectMetadata.modified_at }}
                </li>
                <li>
                  <b>Corpus:</b> {{ projectMetadata.corpus_id }}
                </li>
                <li v-if="formattedFilterString.length > 0">
                  <b>Filters:</b> {{ formattedFilterString }}
                </li>
              </ul>
            </div>
          </template>
        </drilldown-panel>

      </div>
    </div>
  </div>
</template>

<script>
import html2canvas from 'html2canvas';
import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';

import API from '@/api/api';
import DrilldownPanel from '@/components/drilldown-panel';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header';
import FilterValueFormatter from '@/formatters/filter-value-formatter';
import FilterKeyFormatter from '@/formatters/filter-key-formatter';
import modelService from '@/services/model-service';
import { VIEWS_LIST } from '@/utils/views-util';
import { BOOKMARKS } from '@/utils/messages-util';


const MSG_EMPTY_BOOKMARK_TITLE = 'Insight title cannot be blank';

const METDATA_DRILLDOWN_TABS = [
  {
    name: 'Metadata',
    id: 'metadata',
    icon: 'fa-info-circle'
  }
];

export default {
  name: 'NewInsightModal',
  components: {
    DrilldownPanel,
    FullScreenModalHeader
  },
  data: () => ({
    description: '',
    drilldownTabs: METDATA_DRILLDOWN_TABS,
    errorMsg: MSG_EMPTY_BOOKMARK_TITLE,
    hasError: false,
    imagePreview: null,
    metadata: '',
    title: ''
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
    },
    formattedFilterString() {
      const filterString = this.filters?.clauses?.reduce((a, c) => {
        return a + `${a.length > 0 ? ' AND ' : ''} ` +
          `${FilterKeyFormatter(c.field)} ${c.isNot ? 'is not' : 'is'} ` +
          `${c.values.map(v => FilterValueFormatter(v)).join(', ')}`;
      }, '');
      return `${filterString.length > 0 ? filterString : ''}`;
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

      this.description = this.formattedFilterString.length > 0 && `Filters: ${this.formattedFilterString} `;
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

.new-insight-modal-container {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: center;
  align-content: stretch;
  align-items: stretch;
  height: 100vh;
  overflow: hidden;

  .pane-wrapper {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 1em 0 0;
    .pane-row {
      flex: 1 1 auto;
      display: flex;
      flex-direction: row;
      .fields {
        flex: 0 1 auto;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 1rem;
        .preview {
          flex: 0 0 auto;
          margin: 0 0 1rem;
          overflow: hidden;
          img {
            max-height: 100%;
            max-width: 100%;
          }
        }
        .form-group {
          flex: 1 1 auto;
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
        .controls {
          flex: 0 1 auto;
          display: flex;
          justify-content: flex-end;
          padding: 1rem;
          button {
            margin-left: 1rem;
          }
        }
      }
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

