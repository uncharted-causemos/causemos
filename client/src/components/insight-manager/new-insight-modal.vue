<template>
  <new-edit-modal-layout
    v-model:name="name"
    v-model:description="description"
    :has-error="hasError"
    :image-preview="imagePreview"
    :metadata-details="metadataDetails"
    title="New Insight"
    @auto-fill="autofillInsight()"
    @cancel="closeInsight()"
    @save="saveInsight"
  />
</template>

<script>
import html2canvas from 'html2canvas';
import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';
import NewEditModalLayout from '@/components/insight-manager/new-edit-modal-layout';
import modelService from '@/services/model-service';
import insightUtil from '@/utils/insight-util';
import { INSIGHTS } from '@/utils/messages-util';
import { ProjectType } from '@/types/Enums';
import { addInsight } from '@/services/insight-service';

export default {
  name: 'NewInsightModal',
  components: {
    NewEditModalLayout
  },
  data: () => ({
    description: '',
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
      analysisName: 'app/analysisName'
    }),
    formattedFilterString() {
      return insightUtil.getFormattedFilterString(this.filters);
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
      return insightUtil.parseMetadataDetails(this.dataState, this.projectMetadata, this.analysisName, this.formattedFilterString, this.currentView, this.projectType);
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
      setCurrentContextInsightPane: 'contextInsightPanel/setCurrentPane',
      setRefetchInsights: 'contextInsightPanel/setRefetchInsights'
    }),
    closeInsight() {
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
    getAnnotatedState(eventData) {
      return !eventData ? undefined : {
        markerAreaState: eventData.markerAreaState,
        cropAreaState: eventData.cropState,
        imagePreview: eventData.croppedNonAnnotatedImagePreview
      };
    },
    async saveInsight(eventData) {
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
        thumbnail: eventData ? eventData.annotatedImagePreview : this.imagePreview,
        annotation_state: this.getAnnotatedState(eventData),
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
          this.setRefetchInsights(true);
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
