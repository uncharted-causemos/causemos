<template>
  <new-edit-modal-layout
    v-model:name="name"
    v-model:description="description"
    :has-error="hasError"
    :image-preview="imagePreview"
    :metadata-details="metadataDetails"
    :annotation="annotationState"
    :is-new-insight="false"
    title="Edit Insight"
    @cancel="closeInsight()"
    @save="saveInsight"
  />
</template>

<script>
import _ from 'lodash';
import { mapGetters, mapActions } from 'vuex';
import NewEditModalLayout from '@/components/insight-manager/new-edit-modal-layout';
import { updateInsight } from '@/services/insight-service';
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
    annotationState: undefined
  }),
  computed: {
    ...mapGetters({
      currentView: 'app/currentView',
      projectMetadata: 'app/projectMetadata',
      currentPane: 'insightPanel/currentPane',
      isPanelOpen: 'insightPanel/isPanelOpen',
      updatedInsight: 'insightPanel/updatedInsight',
      filters: 'dataSearch/filters',
      analysisName: 'app/analysisName',
      projectType: 'app/projectType'
    }),
    formattedFilterString() {
      return insightUtil.getFormattedFilterString(this.filters);
    },
    metadataDetails() {
      return insightUtil.parseMetadataDetails(this.updatedInsight.data_state, this.projectMetadata, this.analysisName, this.formattedFilterString, this.currentView, this.projectType, this.updatedInsight.modified_at);
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
      if (this.currentPane !== 'edit-insight') {
        this.initInsight();
      }
    }
  },
  methods: {
    ...mapActions({
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      setCurrentPane: 'insightPanel/setCurrentPane',
      setUpdatedInsight: 'insightPanel/setUpdatedInsight',
      hideContextInsightPanel: 'contextInsightPanel/hideContextInsightPanel',
      setCurrentContextInsightPane: 'contextInsightPanel/setCurrentPane',
      setRefetchInsights: 'contextInsightPanel/setRefetchInsights'
    }),
    closeInsight() {
      this.hideInsightPanel();
      this.setCurrentPane('');
      this.setUpdatedInsight(null);
    },
    initInsight() {
      this.name = '';
      this.description = '';
      this.hasError = false;
    },
    getAnnotatedState(eventData) {
      return !eventData ? undefined : {
        markerAreaState: eventData.markerAreaState,
        cropAreaState: eventData.cropState,
        imagePreview: eventData.croppedNonAnnotatedImagePreview
      };
    },
    async saveInsight(eventData) {
      if (this.hasError || _.isEmpty(this.name) || this.updatedInsight === '') return;
      const updatedInsight = this.updatedInsight;
      updatedInsight.name = this.name;
      updatedInsight.description = this.description;
      updatedInsight.thumbnail = eventData ? eventData.annotatedImagePreview : updatedInsight.thumbnail;
      updatedInsight.annotation_state = this.getAnnotatedState(eventData);
      updateInsight(this.updatedInsight.id, updatedInsight)
        .then((result) => {
          if (result.updated === 'success') {
            this.toaster(INSIGHTS.SUCCESFUL_UPDATE, 'success', false);
          } else {
            this.toaster(INSIGHTS.ERRONEOUS_UPDATE, 'error', true);
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
    }
  },
  mounted() {
    this.name = this.updatedInsight.name;
    this.description = this.updatedInsight.description;
    this.imagePreview = this.updatedInsight.thumbnail;
    this.annotationState = this.updatedInsight.annotation_state;
  }
};
</script>
