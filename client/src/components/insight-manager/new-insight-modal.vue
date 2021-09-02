<template>
  <new-edit-modal-layout
    v-model:name="name"
    v-model:description="description"
    :image-preview="imagePreview"
    :metadata-details="metadataDetails"
    title="New Insight"
    @auto-fill="autofillInsight()"
    @cancel="closeInsight()"
    @save="saveInsight()"
  />
</template>

<script>
import html2canvas from 'html2canvas';
import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';
import NewEditModalLayout from '@/components/insight-manager/new-edit-modal-layout';
import FilterValueFormatter from '@/formatters/filter-value-formatter';
import FilterKeyFormatter from '@/formatters/filter-key-formatter';
import modelService from '@/services/model-service';
import { INSIGHTS } from '@/utils/messages-util';
import { ProjectType } from '@/types/Enums';
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
    NewEditModalLayout
  },
  data: () => ({
    description: '',
    drilldownTabs: METDATA_DRILLDOWN_TABS,
    errorMsg: MSG_EMPTY_INSIGHT_NAME,
    hasError: false,
    imagePreview: null,
    metadata: '',
    name: '',
    currentDatacubes: []
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
      ontologyConcepts: 'dataSearch/ontologyConcepts'
    }),
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
    isQuantitativeView() {
      return this.currentView === 'modelPublishingExperiment' ||
      this.currentView === 'data' ||
      this.currentView === 'dataPreview' ||
      this.currentView === 'dataComparative';
    },
    metadataDetails() {
      //
      // currentView dictates what kind of metadata should be visible
      //
      // common (from projectMetadata)
      //  - project name
      //  - analysis name
      //
      // datacube drilldown:
      //  - datacube titles
      //  - selected scenario counts
      //  - region(s): top 5
      //
      // comparative analysis
      //  - datacube titles
      //  - region(s): top 5
      //
      // CAG-based views
      //  - corpus
      //  - ontology
      //  - selected scenario id (if any)
      //  - selected node/edge (if any)
      //  - last modified date
      //  - filters (if any)

      const arr = [];
      // @Review: The content of this function needs to be revised and cleaned
      arr.push({
        key: 'Project Name:',
        value: this.projectMetadata.name
      });
      if (this.dataState) {
        if (this.dataState.datacubeTitles) {
          this.dataState.datacubeTitles.forEach((title, indx) => {
            arr.push({
              key: 'Name(' + indx.toString() + '):',
              value: title.datacubeOutputName + ' | ' + title.datacubeName
            });
          });
        }
        if (this.dataState.selectedScenarioIds) {
          arr.push({
            key: 'Selected Scenarios: ',
            value: this.dataState.selectedScenarioIds.length
          });
        }
        if (this.dataState.datacubeRegions) {
          arr.push({
            key: 'Region(s): ',
            value: this.dataState.datacubeRegions
          });
        }
        if (this.dataState.modelName) {
          arr.push({
            key: 'CAG: ',
            value: this.dataState.modelName
          });
        }
        if (this.dataState.nodesCount) {
          arr.push({
            key: 'Nodes Count: ',
            value: this.dataState.nodesCount
          });
        }
        if (this.dataState.selectedNode) {
          arr.push({
            key: 'Selected Node: ',
            value: this.dataState.selectedNode
          });
        }
        if (this.dataState.selectedEdge) {
          arr.push({
            key: 'Selected Edge: ',
            value: this.dataState.selectedEdge
          });
        }
        if (this.dataState.selectedScenarioId) {
          arr.push({
            key: 'Selected Scenario: ',
            value: this.dataState.selectedScenarioId
          });
        }
        if (this.dataState.currentEngine) {
          arr.push({
            key: 'Engine: ',
            value: this.dataState.currentEngine
          });
        }
      }

      if (!this.isQuantitativeView) {
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

      this.description = this.formattedFilterString.length > 0 ? `Filters: ${this.formattedFilterString} ` : '';
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
