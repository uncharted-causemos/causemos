<template>
  <new-edit-modal-layout
    v-model:name="name"
    v-model:description="description"
    :image-preview="imagePreview"
    :metadata-details="metadataDetails"
    :is-new-insight="false"
    title="Edit Insight"
    @cancel="closeInsight()"
    @save="saveInsight()"
  />
</template>

<script>
import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';
import NewEditModalLayout from '@/components/insight-manager/new-edit-modal-layout';
import FilterValueFormatter from '@/formatters/filter-value-formatter';
import FilterKeyFormatter from '@/formatters/filter-key-formatter';
import { updateInsight } from '@/services/insight-service';
import projectService from '@/services/project-service';
import useInsightsData from '@/services/composables/useInsightsData';
import { INSIGHTS } from '@/utils/messages-util';


const MSG_EMPTY_INSIGHT_NAME = 'Insight name cannot be blank';

export default {
  name: 'EditInsightModal',
  components: {
    NewEditModalLayout
  },
  data: () => ({
    description: '',
    errorMsg: MSG_EMPTY_INSIGHT_NAME,
    hasError: false,
    imagePreview: null,
    metadata: '',
    name: '',
    projectMetadata: null
  }),
  setup() {
    const { insights: listContextInsights, reFetchInsights } = useInsightsData();
    return {
      listContextInsights,
      reFetchInsights
    };
  },
  computed: {
    ...mapGetters({
      currentView: 'app/currentView',
      projectType: 'app/projectType',
      currentCAG: 'app/currentCAG',

      currentPane: 'insightPanel/currentPane',
      isPanelOpen: 'insightPanel/isPanelOpen',
      countInsights: 'insightPanel/countInsights',
      updatedInsightId: 'insightPanel/updatedInsightId',

      viewState: 'insightPanel/viewState',
      contextId: 'insightPanel/contextId',

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
    isQuantitativeView() {
      return this.currentView === 'modelPublishingExperiment' ||
      this.currentView === 'data' ||
      this.currentView === 'dataPreview' ||
      this.currentView === 'dataComparative';
    },
    dataState() {
      return this.currentInsight ? this.currentInsight.data_state : null;
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
      if (this.projectMetadata) {
        arr.push({
          key: 'Project Name:',
          value: this.projectMetadata.name
        });
      }
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

      if (!this.isQuantitativeView && this.projectMetadata) {
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
    },
    currentInsight () {
      const current = this.listContextInsights.filter(i => i.id === this.updatedInsightId);
      return current.length > 0 ? current[0] : null;
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
    async listContextInsights() {
      this.imagePreview = await this.loadSnapshot();
    },
    currentPane() {
      if (this.currentPane !== 'edit-insight') {
        this.initInsight();
      }
    },
    async currentInsight() {
      if (this.currentInsight) {
        console.log(this.currentInsight);
        this.name = this.currentInsight.name;
        this.description = this.currentInsight.description;
        this.projectMetadata = await projectService.getProject(this.currentInsight.project_id);
      }
    }
  },
  methods: {
    ...mapActions({
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      setCountInsights: 'insightPanel/setCountInsights',
      setCurrentPane: 'insightPanel/setCurrentPane',
      setUpdatedInsightId: 'insightPanel/setUpdatedInsightId',
      hideContextInsightPanel: 'contextInsightPanel/hideContextInsightPanel',
      setCurrentContextInsightPane: 'contextInsightPanel/setCurrentPane'
    }),
    closeInsight() {
      this.hideInsightPanel();
      this.setCurrentPane('');
      this.setUpdatedInsightId('');
    },
    initInsight() {
      this.name = '';
      this.description = '';
      this.hasError = false;
    },
    async saveInsight() {
      if (this.hasError || _.isEmpty(this.name) || this.updatedInsightId === '') return;
      const updatedInsight = this.currentInsight;
      updatedInsight.name = this.name;
      updatedInsight.description = this.description;
      updateInsight(this.updatedInsightId, updatedInsight)
        .then((result) => {
          if (result.updated === 'success') {
            this.toaster(INSIGHTS.SUCCESFUL_UPDATE, 'success', false);
          } else {
            this.toaster(INSIGHTS.ERRONEOUS_UPDATE, 'error', true);
          }
          this.closeInsight();
          this.initInsight();
          // also hide the context insight panel if opened, to force refresh upon re-open
          this.closeContextInsightPanel();
        });
    },
    closeContextInsightPanel() {
      this.hideContextInsightPanel();
      this.setCurrentContextInsightPane('');
    },
    async loadSnapshot() {
      const image = this.currentInsight ? this.currentInsight.thumbnail : null;
      return image;
    }
  }
};
</script>
