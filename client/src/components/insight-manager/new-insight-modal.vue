<template>
  <div class="new-insight-modal-container">
    <full-screen-modal-header>
      <h5>New Insight</h5>
    </full-screen-modal-header>
    <div class="pane-wrapper">
      <div class="pane-row">
        <div class="fields">
          <div class="preview" v-if="imagePreview !== null">
            <img :src="imagePreview">
          </div>
          <disclaimer
            v-else
            style="text-align: center; color: black"
            :message="'No image preview!'"
          />
          <div class="form-group">
            <form>
              <label> Name* </label>
              <input
                v-model="name"
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
                rows="2"
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
              :class="{ 'disabled': name.length === 0}"
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
                <li
                  v-for="metadataAttr in metadataDetails"
                  :key="metadataAttr.key">
                  <b>{{metadataAttr.key}}</b> {{ metadataAttr.value }}
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

import DrilldownPanel from '@/components/drilldown-panel';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header';
import FilterValueFormatter from '@/formatters/filter-value-formatter';
import FilterKeyFormatter from '@/formatters/filter-key-formatter';
import modelService from '@/services/model-service';
import { VIEWS_LIST } from '@/utils/views-util';
import { INSIGHTS } from '@/utils/messages-util';
import { ProjectType } from '@/types/Enums';
import Disclaimer from '@/components/widgets/disclaimer';
import { addInsight } from '@/services/insight-service';


const MSG_EMPTY_INSIGHT_NAME = 'Insight name cannot be blank';

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
    FullScreenModalHeader,
    Disclaimer
  },
  data: () => ({
    description: '',
    drilldownTabs: METDATA_DRILLDOWN_TABS,
    errorMsg: MSG_EMPTY_INSIGHT_NAME,
    hasError: false,
    imagePreview: null,
    metadata: '',
    name: ''
  }),
  computed: {
    ...mapGetters({
      currentView: 'app/currentView',
      projectType: 'app/projectType',
      currentCAG: 'app/currentCAG',
      projectMetadata: 'app/projectMetadata',

      currentPane: 'insightPanel/currentPane',
      isPanelOpen: 'insightPanel/isPanelOpen',
      countInsights: 'insightPanel/countInsights',

      dataState: 'insightPanel/dataState',
      viewState: 'insightPanel/viewState',
      contextId: 'insightPanel/contextId',
      project: 'app/project',

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
    },
    insightVisibility() {
      return this.projectType === ProjectType.Analysis ? 'private' : 'public';
      // return (this.currentView === 'modelPublishingExperiment' || this.currentView === 'dataPreview') ? 'public' : 'private';
    },
    insightTargetView() {
      // an insight created during model publication should be listed either
      //  in the full list of insights,
      //  or as a context specific insight when opening the page of the corresponding model family instance
      //  (the latter is currently supported via a special route named dataPreview)
      // return this.currentView === 'modelPublishingExperiment' ? ['data', 'dataPreview', 'domainDatacubeOverview', 'overview', 'modelPublishingExperiment'] : [this.currentView, 'overview'];
      return this.projectType === ProjectType.Analysis ? [this.currentView, 'overview', 'dataComparative'] : ['data', 'nodeDrilldown', 'dataComparative', 'overview', 'dataPreview', 'domainDatacubeOverview', 'modelPublishingExperiment'];
    },
    metadataDetails() {
      const arr = [];
      // @HACK: The content of this function needs to be revised and cleaned
      arr.push({
        key: 'Project Name:',
        value: this.projectMetadata.name
      });
      if (this.currentView === 'modelPublishingExperiment' || this.currentView === 'data') {
        // FIXME: additional metadata attributes should be defined and sent down based on the source page
        arr.push({
          key: 'Model ID:',
          value: this.contextId
        });
        arr.push({
          key: 'Target View:',
          value: this.insightTargetView
        });
        arr.push({
          key: 'Visibility:',
          value: this.insightVisibility
        });
      } else {
        arr.push({
          key: 'Ontology:',
          value: this.projectMetadata.ontology
        });
        arr.push({
          key: 'Created:',
          value: this.projectMetadata.created_at
        });
        arr.push({
          key: 'Modified:',
          value: this.projectMetadata.modified_at
        });
        arr.push({
          key: 'Corpus:',
          value: this.projectMetadata.corpus_id
        });
        if (this.formattedFilterString.length > 0) {
          arr.push({
            key: 'Filters:',
            value: this.formattedFilterString
          });
        }
      }

      return arr;
    }
  },
  watch: {
    name(n) {
      if (_.isEmpty(n) && this.isPanelOpen) {
        this.hasError = true;
        this.errorMsg = MSG_EMPTY_INSIGHT_NAME;
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
      setCurrentPane: 'insightPanel/setCurrentPane',
      hideContextInsightPanel: 'contextInsightPanel/hideContextInsightPanel',
      setCurrentContextInsightPane: 'contextInsightPanel/setCurrentPane'
    }),
    closeInsightPanel() {
      this.hideInsightPanel();
      this.setCurrentPane('');
    },
    initInsight() {
      this.name = '';
      this.description = '';
      this.hasError = false;
    },
    async autofillInsight() {
      this.modelSummary = this.currentCAG ? await modelService.getSummary(this.currentCAG) : null;

      this.name = (this.projectMetadata ? this.projectMetadata.name : '') +
        (this.modelSummary ? (' - ' + this.modelSummary.name) : '') +
        (this.currentView ? (' - ' + this.currentView) : '');

      this.description = this.formattedFilterString.length > 0 && `Filters: ${this.formattedFilterString} `;
    },
    async saveInsight() {
      if (this.hasError || _.isEmpty(this.name)) return;
      const url = this.$route.fullPath;
      const newInsight = {
        name: this.name,
        description: this.description,
        visibility: this.insightVisibility,
        project_id: this.project,
        context_id: this.contextId,
        url,
        target_view: this.insightTargetView,
        pre_actions: null,
        post_actions: null,
        is_default: true,
        analytical_question: [],
        thumbnail: this.imagePreview,
        view_state: this.viewState,
        data_state: this.dataState
      };
      addInsight(newInsight)
        .then((result) => {
          const message = result.status === 200 ? INSIGHTS.SUCCESSFUL_ADDITION : INSIGHTS.ERRONEOUS_ADDITION;
          if (message === INSIGHTS.SUCCESSFUL_ADDITION) {
            this.toaster(message, 'success', false);
            const count = this.countInsights + 1;
            this.setCountInsights(count);
          } else {
            this.toaster(message, 'error', true);
          }
          this.closeInsightPanel();
          this.initInsight();
          // also hide the context insight panel if opened, to force refresh upon re-open
          this.closeContextInsightPanel();
        });
    },
    closeContextInsightPanel() {
      this.hideContextInsightPanel();
      this.setCurrentContextInsightPane('');
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
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding-left: 1rem;
        padding-right: 1rem;
        .preview {
          flex: 0 0 auto;
          margin: 0 0 1rem;
          overflow: hidden;
          align-self: center;
          img {
            max-height: 100%;
            max-width: 100%;
          }
        }
        .form-group {
          flex: 1 1 auto;
          margin-bottom: 3px;
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

