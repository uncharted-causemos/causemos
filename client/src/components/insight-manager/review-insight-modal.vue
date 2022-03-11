<template>
  <div class="new-insight-modal-container">
    <rename-modal
      v-if="showNewQuestion"
      :modal-title="'Add a new question'"
      @confirm="addNewQuestion"
      @cancel="showNewQuestion = false"
    />
    <full-screen-modal-header
      icon="angle-left"
      :nav-back-label="newMode ? 'Close' : 'All Insights'"
      @close="closeInsightReview"
    >
      <button
        v-if="updatedInsight !== null && !isEditingInsight"
        type="button"
        class="btn btn-primary btn-call-for-action"
        @click="editInsight"
        >
        <i class="fa fa-pencil" />
        Edit
      </button>
      <div v-else class="insight-edit-controls">
        <button type="button" class="btn btn-default" @click="annotateImage">
          Annotate
        </button>
        <button type="button" class="btn btn-default" @click="cropImage">
          Crop
        </button>
        <button class="btn btn-default btn-extra-margin" @click="cancelInsightEdit">
          Cancel
        </button>
        <button
          :disabled="hasError"
          type="button"
          class="btn btn-primary btn-call-for-action"
          v-tooltip="'Save insight'"
          @click="confirmInsightEdit"
        >
          Done
        </button>
      </div>
      <button
        v-if="updatedInsight !== null"
        class="btn btn-default btn-delete"
        @click="removeInsight"
      >
        <i class="fa fa-trash" />
        Delete
      </button>
      <template #trailing>
        <div class="trailing">
          <button
            v-if="updatedInsight !== null"
            type="button"
            class="btn btn-default"
            v-tooltip="'Toggle metadata'"
            @click="showMetadataPanel=!showMetadataPanel"
            >
            <i class="fa fa-info" />
          </button>
          <button
            v-if="updatedInsight !== null"
            type="button"
            class="btn btn-default"
            v-tooltip="'Jump to live context'"
            @click="selectInsight"
            >
            <i class="fa fa-level-up" />
          </button>
          <div class="export" v-if="updatedInsight !== null">
            <span>Export insight as</span>
            <button
              class="btn btn-default"
              @click="() => exportInsight('Powerpoint')"
            >
              PowerPoint
            </button>
            <button class="btn btn-default" @click="() => exportInsight('Word')">
              Word
            </button>
          </div>
        </div>
      </template>
    </full-screen-modal-header>
    <div class="pane-row">
      <button
        v-if="!newMode"
        :disabled="prevInsight === null"
        type="button"
        class="btn btn-default"
        v-tooltip="'Previous insight'"
        @click="goToPreviousInsight"
        >
        <i class="fa fa-chevron-left" />
      </button>
      <div class="content">
        <div class="fields">
          <div style="display: flex; align-items: baseline;">
            <div v-if="!isEditingInsight" class="question-title">{{insightQuestionLabel}}</div>
            <dropdown-button
              v-else
              class="dropdown-button"
              :is-dropdown-left-aligned="true"
              :items="questionsDropdown"
              :inner-button-label="insightQuestionInnerLabel"
              :selected-item="selectedInsightQuestion"
              @item-selected="setInsightQuestion"
            />
            <small-text-button
              v-if="!loadingImage && isEditingInsight"
              :label="'New question'"
              @click="showNewQuestion = true"
            />
          </div>
          <div v-if="!isEditingInsight" class="title">{{previewInsightTitle}}</div>
          <input
            v-else
            v-model="insightTitle"
            v-focus
            type="text"
            class="form-control"
            placeholder="Untitled insight name"
          />
          <div
            v-if="isEditingInsight && hasError"
            class="error-msg">
            {{ errorMsg }}
          </div>
          <div v-if="!isEditingInsight" class="desc">{{previewInsightDesc}}</div>
          <textarea
            v-else
            v-model="insightDesc"
            :rows="2"
            class="form-control"
            placeholder="Untitled insight description" />
          <div class="image-preview-and-metadata">
            <div v-if="imagePreview !== null" class="preview">
              <img id="finalImagePreview" ref="finalImagePreview" :src="imagePreview">
              <div v-if="showCropInfoMessage" style="align-self: center">Annotations are still there, but not shown when the image is being cropped!</div>
            </div>
            <div v-else style="width: 100%;">
              <div v-if="loadingImage" style="text-align: center; font-size: x-large">
                <i class="fa fa-spin fa-spinner" /> Loading image ...
              </div>
              <disclaimer
                v-else
                style="text-align: center; color: black"
                :message="updatedInsight === null ? 'No more insights available to preview!' : 'No image preview!'"
              />
            </div>
            <drilldown-panel
              v-if="showMetadataPanel"
              is-open
              :tabs="drilldownTabs"
              :activeTabId="drilldownTabs[0].id"
              only-display-icons
              @close="showMetadataPanel=false"
            >
              <template #content>
                <insight-summary
                  v-if="metadataDetails"
                  :metadata-details="metadataDetails"
                />
              </template>
            </drilldown-panel>
          </div>
        </div>
      </div>

      <button
        v-if="!newMode"
        :disabled="nextInsight === null"
        type="button"
        class="btn btn-default"
        v-tooltip="'Next insight'"
        @click="goToNextInsight"
        >
        <i class="fa fa-chevron-right" />
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, ref, toRefs, watch } from 'vue';
import Disclaimer from '@/components/widgets/disclaimer.vue';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header.vue';
import { mapActions, mapGetters, useStore } from 'vuex';
import InsightUtil from '@/utils/insight-util';
import { Insight, InsightMetadata, FullInsight, AnalyticalQuestion, ViewState } from '@/types/Insight';
import router from '@/router';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import { addInsight, updateInsight } from '@/services/insight-service';
import { INSIGHTS, QUESTIONS } from '@/utils/messages-util';
import useToaster from '@/services/composables/useToaster';
import html2canvas from 'html2canvas';
import _ from 'lodash';
import { ProjectType } from '@/types/Enums';
import { MarkerArea, MarkerAreaState } from 'markerjs2';
import { CropArea, CropAreaState } from 'cropro';
import InsightSummary from './insight-summary.vue';
import DropdownButton from '@/components/dropdown-button.vue';
import SmallTextButton from '@/components/widgets/small-text-button.vue';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import { addQuestion, updateQuestion } from '@/services/question-service';
import { sortQuestionsByPath, SORT_PATH } from '@/utils/questions-util';
import useQuestionsData from '@/services/composables/useQuestionsData';

const MSG_EMPTY_INSIGHT_NAME = 'Insight name cannot be blank';
const LBL_EMPTY_INSIGHT_NAME = '<Insight title missing...>';
const LBL_EMPTY_INSIGHT_QUESTION = 'Add to Analysis Checklist section';

const METDATA_DRILLDOWN_TABS = [
  {
    name: 'Metadata',
    id: 'metadata',
    icon: 'fa-info-circle'
  }
];

export default defineComponent({
  name: 'ReviewInsightModal',
  components: {
    FullScreenModalHeader,
    Disclaimer,
    DrilldownPanel,
    InsightSummary,
    DropdownButton,
    SmallTextButton,
    RenameModal
  },
  props: {
    editMode: {
      type: Boolean,
      default: false
    },
    newMode: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const {
      newMode
    } = toRefs(props);

    const store = useStore();
    const toaster = useToaster();
    const { questionsList, reFetchQuestions } = useQuestionsData();

    const updatedInsight = computed(() => store.getters['insightPanel/updatedInsight']);

    const selectedInsightQuestion = ref('');
    const insightQuestionInnerLabel = ref(LBL_EMPTY_INSIGHT_QUESTION);
    const loadingImage = ref(false);
    const sortedQuestions = computed<AnalyticalQuestion[]>(() => sortQuestionsByPath(questionsList.value));

    const getQuestionById = (id: string) => {
      return sortedQuestions.value.find(q => q.id === id);
    };

    const insightQuestionLabel = computed<string>(() => {
      if (updatedInsight.value && updatedInsight.value.analytical_question.length > 0) {
        const questionObj = getQuestionById(updatedInsight.value.analytical_question[0]);
        if (questionObj) {
          return questionObj.question;
        }
      }
      return '';
    });

    watch(
      () => [
        questionsList.value
      ],
      () => {
        // if we are reviewing this insight in edit mode,
        //  it may have a current linking with some analytical question
        //  so we need to surface that
        if (updatedInsight.value && !newMode.value && selectedInsightQuestion.value === '') {
          if (updatedInsight.value.analytical_question.length > 0) {
            const questionObj = getQuestionById(updatedInsight.value.analytical_question[0]);
            if (questionObj) {
              selectedInsightQuestion.value = questionObj.question;
              insightQuestionInnerLabel.value = '';
            }
          }
        }
      }
    );

    return {
      toaster,
      store,
      questionsList,
      reFetchQuestions,
      updatedInsight,
      selectedInsightQuestion,
      sortedQuestions,
      insightQuestionInnerLabel,
      insightQuestionLabel,
      loadingImage
    };
  },
  data: () => ({
    errorMsg: MSG_EMPTY_INSIGHT_NAME,
    drilldownTabs: METDATA_DRILLDOWN_TABS,
    showMetadataPanel: false,
    isEditingInsight: false,
    insightTitle: '',
    insightDesc: '',
    imagePreview: null as string | null,
    hasError: false, // true when insight name is invalid
    //
    markerAreaState: undefined as MarkerAreaState | undefined,
    markerArea: undefined as MarkerArea | undefined,
    cropArea: undefined as CropArea | undefined,
    cropState: undefined as CropAreaState | undefined,
    originalImagePreview: '',
    lastCroppedImage: '',
    lastAnnotatedImage: '',
    showCropInfoMessage: false,
    showNewQuestion: false
  }),
  watch: {
    insightTitle: {
      handler(n) {
        if (n.length === 0 || n === LBL_EMPTY_INSIGHT_NAME) {
          this.hasError = true;
        } else {
          this.hasError = false;
        }
      }
    },
    editMode: {
      handler(/* newValue, oldValue */) {
        if (this.updatedInsight && this.editMode) {
          this.editInsight();
        }
      },
      immediate: true
    },
    newMode: {
      handler(/* newValue, oldValue */) {
        // clear insight fields: name/desc
        // capture the image
      },
      immediate: true
    },
    imagePreview() {
      if (this.imagePreview !== null) {
        // apply previously saved annotation, if any
        if (this.annotation) {
          this.originalImagePreview = this.annotation.originalImagePreview;
          // this.lastCroppedImage = this.annotation.previewImage;
          if (this.annotation.markerAreaState || this.annotation.cropAreaState) {
            this.markerAreaState = this.annotation.markerAreaState;
            this.cropState = this.annotation.cropAreaState;
            // NOTE: REVIEW: FIXME:
            //  restoring both annotation and/or cropping is tricky since each one calls the other
            if (this.markerAreaState) {
              nextTick(() => {
                const refAnnotatedImage = this.$refs.finalImagePreview as HTMLImageElement;
                refAnnotatedImage.src = this.originalImagePreview;
                this.annotateImage();
                (this.markerArea as MarkerArea).startRenderAndClose();
              });
            }
          }
        } else {
          this.originalImagePreview = this.imagePreview;
        }
      } else {
        this.originalImagePreview = '';
      }
    },
    updatedInsight() {
      if (this.updatedInsight) {
        // every time the user navigates to a new insight (or removes the current insight), re-fetch the image
        // NOTE: imagePreview ideally could be a computed prop, but when in newMode the image is fetched differently
        //       plus once imagePreview is assigned its watch will apply-annotation insight if any
        this.imagePreview = this.updatedInsight.thumbnail;
      } else {
        this.imagePreview = null;
      }
    }
  },
  computed: {
    ...mapGetters({
      project: 'app/project',
      projectType: 'app/projectType',
      currentView: 'app/currentView',
      dataState: 'insightPanel/dataState',
      viewState: 'insightPanel/viewState',
      contextId: 'insightPanel/contextId',
      projectMetadata: 'app/projectMetadata',
      currentPane: 'insightPanel/currentPane',
      isPanelOpen: 'insightPanel/isPanelOpen',
      insightList: 'insightPanel/insightList',
      countInsights: 'insightPanel/countInsights',
      reviewIndex: 'insightPanel/reviewIndex',
      filters: 'dataSearch/filters',
      analysisName: 'app/analysisName'
    }),
    questionsDropdown() {
      return ['', ...this.sortedQuestions.map(q => q.question)];
    },
    nextInsight(): Insight | null {
      if (this.reviewIndex < this.insightList.length - 1) {
        return this.insightList[this.reviewIndex + 1];
      }
      return null;
    },
    prevInsight(): Insight | null {
      if (this.reviewIndex > 0) {
        return this.insightList[this.reviewIndex - 1];
      }
      return null;
    },
    formattedFilterString(): string {
      return InsightUtil.getFormattedFilterString(this.filters);
    },
    metadataDetails(): InsightMetadata {
      const dState = this.newMode || this.updatedInsight === null ? this.dataState : this.updatedInsight.data_state;
      const insightLastUpdate = this.newMode || this.updatedInsight === null ? undefined : this.updatedInsight.modified_at;
      const insightSummary = InsightUtil.parseMetadataDetails(dState, this.projectMetadata, this.analysisName, this.formattedFilterString, this.currentView, this.projectType, insightLastUpdate);
      return insightSummary;
    },
    previewInsightTitle(): string {
      if (this.loadingImage) return '';
      return this.updatedInsight && this.updatedInsight.name.length > 0 ? this.updatedInsight.name : LBL_EMPTY_INSIGHT_NAME;
    },
    previewInsightDesc(): string {
      if (this.loadingImage) return '';
      return this.updatedInsight && this.updatedInsight.description.length > 0 ? this.updatedInsight.description : '<Insight description missing...>';
    },
    insightVisibility(): string {
      return this.projectType === ProjectType.Analysis ? 'private' : 'public';
      // return (this.currentView === 'modelPublishingExperiment' || this.currentView === 'dataPreview') ? 'public' : 'private';
    },
    insightTargetView(): string[] {
      // an insight created during model publication should be listed either
      //  in the full list of insights,
      //  or as a context specific insight when opening the page of the corresponding model family instance
      //  (the latter is currently supported via a special route named dataPreview)
      // return this.currentView === 'modelPublishingExperiment' ? ['data', 'dataPreview', 'domainDatacubeOverview', 'overview', 'modelPublishingExperiment'] : [this.currentView, 'overview'];
      return this.projectType === ProjectType.Analysis ? [this.currentView, 'overview', 'dataComparative'] : ['data', 'nodeDrilldown', 'dataComparative', 'overview', 'dataPreview', 'domainDatacubeOverview', 'modelPublishingExperiment'];
    },
    annotation(): any {
      return this.updatedInsight ? this.updatedInsight.annotation_state : undefined;
    }
  },
  async mounted() {
    if (this.newMode) {
      this.loadingImage = true;
      this.imagePreview = await this.takeSnapshot();
      this.loadingImage = false;
      this.showMetadataPanel = true;
      this.editInsight();
    } else {
      if (this.updatedInsight) {
        this.imagePreview = this.updatedInsight.thumbnail;
      }
    }
  },
  methods: {
    ...mapActions({
      setCurrentPane: 'insightPanel/setCurrentPane',
      showInsightPanel: 'insightPanel/showInsightPanel',
      setUpdatedInsight: 'insightPanel/setUpdatedInsight',
      setInsightList: 'insightPanel/setInsightList',
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      setCountInsights: 'insightPanel/setCountInsights',
      setReviewIndex: 'insightPanel/setReviewIndex',
      hideContextInsightPanel: 'contextInsightPanel/hideContextInsightPanel',
      setCurrentContextInsightPane: 'contextInsightPanel/setCurrentPane',
      setRefetchInsights: 'contextInsightPanel/setRefetchInsights'
    }),
    setInsightQuestion(question: string) {
      this.selectedInsightQuestion = question;
      this.insightQuestionInnerLabel = question === '' ? LBL_EMPTY_INSIGHT_QUESTION : '';
    },
    addNewQuestion(newQuestionText: string) {
      this.showNewQuestion = false;

      const url = this.$route.fullPath;
      const viewState: ViewState = _.cloneDeep(this.viewState);
      const newQuestionOrderIndx = _.get(_.maxBy(this.sortedQuestions, SORT_PATH), SORT_PATH);
      viewState.analyticalQuestionOrder = newQuestionOrderIndx !== undefined ? (newQuestionOrderIndx + 1) : this.sortedQuestions.length;
      const newQuestion: AnalyticalQuestion = {
        question: newQuestionText,
        description: '',
        visibility: 'private', // this.questionVisibility(),
        project_id: this.project,
        context_id: this.contextId,
        url,
        target_view: this.insightTargetView,
        pre_actions: null,
        post_actions: null,
        linked_insights: [],
        view_state: viewState
      };
      addQuestion(newQuestion).then((result) => {
        const message = result.status === 200 ? QUESTIONS.SUCCESSFUL_ADDITION : QUESTIONS.ERRONEOUS_ADDITION;
        if (message === QUESTIONS.SUCCESSFUL_ADDITION) {
          this.toaster(message, 'success', false);
          // refresh the latest list from the server
          this.reFetchQuestions();
        } else {
          this.toaster(message, 'error', true);
        }
      });
    },
    async takeSnapshot() {
      const el = document.getElementsByClassName('insight-capture')[0] as HTMLElement;
      const image = _.isNil(el) ? null : (await html2canvas(el, { scale: 1 })).toDataURL();
      return image;
    },
    closeInsightReview() {
      if (this.newMode) {
        this.hideInsightPanel();
        this.setCurrentPane('');
      } else {
        if (this.updatedInsight) {
          this.cancelInsightEdit();
        }
        this.showInsightPanel();
        this.setCurrentPane('list-insights');
      }
    },
    removeInsight() {
      // before deletion, find the index of the insight to be removed
      const indx = this.insightList.findIndex((ins: Insight) => ins.id === this.updatedInsight.id);

      // remove the insight from the server
      InsightUtil.removeInsight(this.updatedInsight.id, this.store);

      // close editing before deleting insight (this will ensure annotation/crop mode is cleaned up)
      this.cancelInsightEdit();

      // remove this insight from the local insight list
      const filteredInsightList: Insight[] = this.insightList.filter((ins: Insight) => ins.id !== this.updatedInsight.id);
      this.setInsightList(filteredInsightList);

      // switch to the next/prev insight and update the 'updatedInsight'
      //  if no more insights, exit this gallery view
      if (filteredInsightList.length === 0) {
        this.setUpdatedInsight(null);
        this.showMetadataPanel = false;
      } else {
        const updatedIndx = Math.min(indx, filteredInsightList.length - 1);
        this.setUpdatedInsight(filteredInsightList[updatedIndx]);
      }
    },
    goToPreviousInsight() {
      if (this.isEditingInsight) {
        this.cancelInsightEdit();
      }
      this.setUpdatedInsight(this.prevInsight);
      this.setReviewIndex(this.reviewIndex - 1);
    },
    goToNextInsight() {
      if (this.isEditingInsight) {
        this.cancelInsightEdit();
      }
      this.setUpdatedInsight(this.nextInsight);
      this.setReviewIndex(this.reviewIndex + 1);
    },
    editInsight() {
      this.isEditingInsight = true;
      // save current insight name/desc in case the user cancels the edit action
      this.insightTitle = this.newMode ? '' : this.updatedInsight.name;
      this.insightDesc = this.newMode ? '' : this.updatedInsight.description;
    },
    cancelInsightEdit() {
      this.isEditingInsight = false;
      this.insightTitle = '';

      // if annotation/cropping was enabled, we need to apply them
      // this.revertImage();
      if (this.markerArea?.isOpen) {
        this.markerArea.close();
      }
      if (this.cropArea?.isOpen) {
        this.cropArea.close();
      }

      if (this.newMode || this.updatedInsight === null) {
        this.closeInsightReview();
      }
    },
    confirmInsightEdit() {
      this.isEditingInsight = false;

      // save the updated insight in the backend
      this.saveInsight();
    },
    getAnnotatedState(stateData: any) {
      return !stateData ? undefined : {
        markerAreaState: stateData.markerAreaState,
        cropAreaState: stateData.cropState,
        imagePreview: stateData.croppedNonAnnotatedImagePreview,
        originalImagePreview: stateData.originalImagePreview
      };
    },
    closeContextInsightPanel() {
      this.hideContextInsightPanel();
      this.setCurrentContextInsightPane('');
    },
    saveInsight() {
      if (this.hasError || this.insightTitle.trim().length === 0) return;

      // FIXME: we should maintain the original non-cropped image for future crop edits
      const refFinalImage = this.$refs.finalImagePreview as HTMLImageElement;
      const annotateCropSaveObj = {
        annotatedImagePreview: refFinalImage.src,
        croppedNonAnnotatedImagePreview: this.lastCroppedImage !== '' ? this.lastCroppedImage : this.originalImagePreview,
        originalImagePreview: this.originalImagePreview,
        markerAreaState: this.markerAreaState,
        cropState: this.cropState
      };
      const insightThumbnail = annotateCropSaveObj.annotatedImagePreview;
      const annotationAndCropState = this.getAnnotatedState(annotateCropSaveObj);

      const linkedQuestion = this.sortedQuestions.find(q => q.question === this.selectedInsightQuestion);

      if (this.newMode) {
        // saving a new insight
        const url = this.$route.fullPath;

        const newInsight: FullInsight = {
          name: this.insightTitle,
          description: this.insightDesc,
          visibility: this.insightVisibility,
          project_id: this.project,
          context_id: this.contextId,
          url,
          target_view: this.insightTargetView,
          pre_actions: null,
          post_actions: null,
          is_default: true,
          analytical_question: linkedQuestion && linkedQuestion.id ? [linkedQuestion.id] : [],
          thumbnail: insightThumbnail,
          annotation_state: annotationAndCropState,
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

              // after the insight is created and have a valid id, we need to link that to the question
              if (linkedQuestion) {
                const insightId = result.data.id;
                linkedQuestion?.linked_insights.push(insightId);
                updateQuestion(linkedQuestion.id as string, linkedQuestion);
              }
            } else {
              this.toaster(message, 'error', true);
            }
            this.closeInsightReview();
            this.closeContextInsightPanel();
            this.setRefetchInsights(true);
          });
        // just in case the call to the server fails
        this.closeInsightReview();
        this.closeContextInsightPanel();
      } else {
        // saving an existing insight
        if (this.updatedInsight) {
          const updatedInsight = this.updatedInsight;
          updatedInsight.name = this.insightTitle;
          updatedInsight.description = this.insightDesc;
          updatedInsight.thumbnail = insightThumbnail;
          updatedInsight.annotation_state = annotationAndCropState;
          updateInsight(this.updatedInsight.id, updatedInsight)
            .then((result) => {
              if (result.updated === 'success') {
                this.toaster(INSIGHTS.SUCCESSFUL_UPDATE, 'success', false);
              } else {
                this.toaster(INSIGHTS.ERRONEOUS_UPDATE, 'error', true);
              }
            });
        }
      }
    },
    selectInsight() {
      const insight = this.updatedInsight;
      const currentURL = this.$route.fullPath;
      const finalURL = InsightUtil.jumpToInsightContext(insight, currentURL);
      if (finalURL) {
        this.$router.push(finalURL);
      } else {
        router.push({
          query: {
            insight_id: insight.id
          }
        }).catch(() => {});
      }
      this.hideInsightPanel();
    },
    exportInsight(item: string) {
      switch (item) {
        case 'Word':
          InsightUtil.exportDOCX([this.updatedInsight], this.projectMetadata);
          break;
        case 'Powerpoint':
          InsightUtil.exportPPTX([this.updatedInsight], this.projectMetadata);
          break;
        default:
          break;
      }
    },
    revertImage() {
      if (this.markerArea?.isOpen) {
        this.markerArea.close();
      }

      if (this.cropArea?.isOpen) {
        this.cropArea.close();
      }

      this.markerAreaState = undefined;
      this.cropState = undefined;
      this.lastCroppedImage = '';
      this.showCropInfoMessage = false;

      // revert img reference to the original image
      if (this.originalImagePreview && this.originalImagePreview !== '') {
        const refFinalImage = this.$refs.finalImagePreview as HTMLImageElement;
        refFinalImage.src = this.originalImagePreview;
      }
    },
    annotateImage() {
      if (this.cropArea?.isOpen) {
        this.cropArea.close();
      }

      if (this.markerArea?.isOpen) {
        return;
      }

      const refAnnotatedImage = this.$refs.finalImagePreview as HTMLImageElement;

      // save the content of the annotated image to restore if the user cancels the annotation
      this.lastAnnotatedImage = refAnnotatedImage.src;

      // copy the cropped, non-annotated, image as the source of the annotation
      refAnnotatedImage.src = this.lastCroppedImage !== '' ? this.lastCroppedImage : this.originalImagePreview;

      // create an instance of MarkerArea and pass the target image reference as a parameter
      this.markerArea = new MarkerArea(refAnnotatedImage);

      // attach the annotation UI to the parent of the image
      this.markerArea.targetRoot = refAnnotatedImage.parentElement as HTMLElement;
      this.markerArea.renderAtNaturalSize = true;

      let annotationSaved = false;

      // register an event listener for when user clicks Close in the marker.js UI
      // NOTE: this event is also called when the user clicks OK/save in the marker.js UI
      this.markerArea.addCloseEventListener(() => {
        if (!annotationSaved) {
          refAnnotatedImage.src = this.lastAnnotatedImage;
        }
        annotationSaved = false;
      });

      // register an event listener for when user clicks OK/save in the marker.js UI
      this.markerArea.addRenderEventListener((dataUrl, state) => {
        annotationSaved = true;

        // we are setting the markup result to replace our original image on the page
        // but you can set a different image or upload it to your server
        refAnnotatedImage.src = dataUrl;

        // save state
        this.markerAreaState = state;
      });

      // finally, call the show() method and marker.js UI opens
      this.markerArea.show();

      // if previous state is present - restore it
      if (this.markerAreaState) {
        this.markerArea.restoreState(this.markerAreaState);
      }
    },
    cropImage() {
      if (this.markerArea?.isOpen) {
        this.markerArea.close();
      }
      if (this.cropArea?.isOpen) {
        return;
      }

      this.showCropInfoMessage = true;

      const refCroppedImage = this.$refs.finalImagePreview as HTMLImageElement;

      // create an instance of CropArea and pass the target image reference as a parameter
      this.cropArea = new CropArea(refCroppedImage);
      this.cropArea.renderAtNaturalSize = true;

      // before beginning the crop mode,
      //  we must ensure the full image is shown as the crop source
      // @LIMITATION: we are not able to leverage a good preview of the full original image with annotations applied unless we invoke the annotate-tool and wait until it is done
      refCroppedImage.src = this.originalImagePreview;

      // attach the crop UI to the parent of the image
      this.cropArea.targetRoot = refCroppedImage.parentElement as HTMLElement;

      // ensure the whole image is visible all the time
      this.cropArea.zoomToCropEnabled = false;

      // do not allow rotation and image flipping
      this.cropArea.styles.settings.hideBottomToolbar = true;

      // hide alignment grid
      this.cropArea.isGridVisible = false;

      let croppedSaved = false;

      // register an event listener for when user clicks Close in the marker.js UI
      // NOTE: this event is also called when the user clicks OK/save in the marker.js UI
      this.cropArea.addCloseEventListener(() => {
        if (!croppedSaved) {
          refCroppedImage.src = this.lastCroppedImage;

          // hide the info message regarding the crop preview and the visibility of annotations
          this.showCropInfoMessage = false;

          // apply existing annotations, if any, after cancelling the image crop
          nextTick(() => {
            // note that this close event may be called if the user clicks Annotate while the crop mode was open
            // so we should not request re-annotation (in the next tick)
            //  or otherwise it would cancel the annotation mode that is being initiated
            if (!this.markerArea?.isOpen) {
              this.annotateImage();
              (this.markerArea as MarkerArea).startRenderAndClose();
            }
          });
        }
        croppedSaved = false;
      });

      // register an event listener for when user clicks OK/save in the CROPRO UI
      this.cropArea.addRenderEventListener((dataUrl, state) => {
        // we are setting the cropping result to replace our original image on the page
        // but you can set a different image or upload it to your server
        refCroppedImage.src = dataUrl;

        // save the cropped image (which would be used as the source of the annotation later on)
        this.lastCroppedImage = dataUrl;

        // hide the info message regarding the crop preview and the visibility of annotations
        this.showCropInfoMessage = false;

        // save state
        this.cropState = state;

        // apply existing annotations, if any, after cropping the image
        nextTick(() => {
          this.annotateImage();
          (this.markerArea as MarkerArea).startRenderAndClose();
        });
      });

      // finally, call the show() method and CROPRO UI opens
      this.cropArea.show();

      // handle previous state if present
      if (this.cropState) {
        //
        // Do not restore the state and crop the image
        // Instead, show the original image and the crop rect
        //
        const cropAreaTemp = this.cropArea as any;
        cropAreaTemp.cropLayer.setCropRectangle(this.cropState.cropRect);
      }
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.insight-edit-controls {
  display: flex;
  gap: 5px;
}

.btn-extra-margin {
  margin-left: 5px;
}

.btn-delete {
  margin-left: 10px;
  &, &:hover {
    color: red;
  }
}

.export {
  display: flex;
  gap: 5px;
  align-items: center;

  > span {
    color: white;
  }
}

.trailing {
  display: flex;
  gap: 10px;
  margin-right: 10px;
}

.new-insight-modal-container {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: center;
  align-content: stretch;
  align-items: stretch;
  height: 100vh;
  overflow: hidden;
}

.pane-row {
  margin-top: 10px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
}

.content {
  justify-content: center;
  display: flex;
  height: 100%;
  width: 100%;
  .fields {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-left: 1rem;
    padding-right: 1rem;
    padding-bottom: 1rem;
    height: 100%;
    .question-title {
      font-size: 2rem;
      flex: 1;
      color: black;
    }
    .title {
      font-size: $font-size-extra-large;
      color: black;
      font-weight: bold;
    }
    .desc {
      font-size: $font-size-large;
      color: $text-color-dark;
      font-style: italic;
    }
    .image-preview-and-metadata {
      display: flex;
      overflow: auto;
      padding-top: 5px;
      flex: 1;
      min-height: 0;
      .preview {
        overflow: auto;
        align-self: flex-start;
        padding-right: 1rem;
        flex: 1;
        min-width: 0;
        img {
          width: 100%;
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


.dropdown-button {
  width: auto;
  height: auto;
  display: flex;
  margin-bottom: 4px;
  flex: 1;

  ::v-deep(.dropdown-btn) {
    width: 100%;
    justify-content: space-between;
  }
  ::v-deep(.dropdown-container) {
    width: 100%;
  }
}

</style>

