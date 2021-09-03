<template>
  <new-edit-modal-layout
    v-model:name="name"
    v-model:description="description"
    :has-error="hasError"
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
import { updateInsight } from '@/services/insight-service';
import projectService from '@/services/project-service';
import useInsightsData from '@/services/composables/useInsightsData';
import insightUtil from '@/utils/insight-util';
import { INSIGHTS } from '@/utils/messages-util';

export default {
  name: 'EditInsightModal',
  components: {
    NewEditModalLayout
  },
  data: () => ({
    description: '',
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
      return insightUtil.getFormattedFilterString(this.filters);
    },
    dataState() {
      return this.currentInsight ? this.currentInsight.data_state : null;
    },
    currentInsight () {
      const current = this.listContextInsights.filter(i => i.id === this.updatedInsightId);
      return current.length > 0 ? current[0] : null;
    },
    metadataDetails() {
      return insightUtil.parseMetadataDetails(this.dataState, this.projectMetadata, this.formattedFilterString, this.currentView);
    }
  },
  watch: {
    name(n) {
      if (_.isEmpty(n) && this.isPanelOpen) {
        this.hasError = true;
      } else {
        this.hasError = false;
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
      this.reFetchInsights();
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
