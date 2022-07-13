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
      :nav-back-label="isNewModeActive ? 'Close' : 'All Insights'"
      @close="closeInsightReview"
    >
      <button
        v-if="updatedInsight !== null && !isEditingInsight"
        type="button"
        class="btn btn-call-to-action"
        :disabled="!isInsight"
        @click="editInsight"
        >
        <i class="fa fa-pencil" />
        Edit
      </button>
      <div v-else class="insight-edit-controls">
        <button type="button" class="btn" @click="annotateImage">
          Annotate
        </button>
        <button type="button" class="btn" @click="cropImage">
          Crop
        </button>
        <button class="btn btn-extra-margin" @click="cancelInsightEdit">
          Cancel
        </button>
        <button
          :disabled="hasError"
          type="button"
          class="btn btn-call-to-action"
          v-tooltip="'Save insight'"
          @click="confirmInsightEdit"
        >
          Done
        </button>
      </div>
      <button
        v-if="updatedInsight !== null"
        class="btn btn-delete"
        :disabled="!isInsight"
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
            class="btn"
            v-tooltip="'Toggle metadata'"
            :disabled="!isInsight"
            @click="showMetadataPanel=!showMetadataPanel"
            >
            <i class="fa fa-info" />
          </button>
          <button
            v-if="updatedInsight !== null"
            type="button"
            class="btn"
            v-tooltip="'Jump to live context'"
            :disabled="!isInsight"
            @click="selectInsight"
            >
            <i class="fa fa-level-up" />
          </button>
          <div class="export" v-if="updatedInsight !== null">
            <span>Export insight as</span>
            <button
              class="btn"
              @click="() => exportInsight('Powerpoint')"
            >
              PowerPoint
            </button>
            <button class="btn" @click="() => exportInsight('Word')">
              Word
            </button>
          </div>
        </div>
      </template>
    </full-screen-modal-header>
    <div class="pane-row">
      <button
        v-if="!isNewModeActive"
        :disabled="previousSlide === null"
        type="button"
        class="btn"
        v-tooltip="'Previous insight'"
        @click="goToPreviousSlide"
        >
        <i class="fa fa-chevron-left" />
      </button>
      <div class="content">
        <div class="fields">
          <div style="display: flex; align-items: baseline;">
            <template v-if="!isEditingInsight">
              <div class="question-title">{{insightQuestionLabel}}</div>
              <div v-if="insightLinkedQuestionsCount" class="other-question-title">{{insightLinkedQuestionsCount}}</div>
            </template>
            <dropdown-button
              v-else
              class="dropdown-button"
              :is-dropdown-left-aligned="true"
              :items="questionsDropdown"
              :inner-button-label="insightQuestionInnerLabel"
              :selected-items="selectedInsightQuestions"
              :is-multi-select="true"
              @items-selected="setInsightQuestions"
            />
            <small-text-button
              v-if="!loadingImage && isEditingInsight"
              :label="'New question'"
              @click="showNewQuestion = true"
            />
          </div>
          <template v-if="isInsight || isNewModeActive">
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
          </template>
          <template v-else>
            <message-display
              class="pane-content"
              :message="messageNoData"
            />
          </template>
        </div>
      </div>

      <button
        v-if="!isNewModeActive"
        :disabled="nextSlide === null"
        type="button"
        class="btn"
        v-tooltip="'Next insight'"
        @click="goToNextSlide"
        >
        <i class="fa fa-chevron-right" />
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, ref, watch } from 'vue';
import Disclaimer from '@/components/widgets/disclaimer.vue';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header.vue';
import { mapActions, mapGetters, useStore } from 'vuex';
import InsightUtil from '@/utils/insight-util';
import { Insight, InsightMetadata, FullInsight, DataState, SectionWithInsights, ReviewPosition } from '@/types/Insight';
import router from '@/router';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import { addInsight, updateInsight, fetchPartialInsights, extractMetadataDetails, removeInsight } from '@/services/insight-service';
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
import { updateQuestion } from '@/services/question-service';
import useQuestionsData from '@/services/composables/useQuestionsData';
import MessageDisplay from '@/components/widgets/message-display.vue';
import { fetchImageAsBase64 } from '@/services/new-datacube-service';
import { getBibiographyFromCagIds } from '@/services/bibliography-service';

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
    RenameModal,
    MessageDisplay
  },
  setup() {
    const store = useStore();
    const toaster = useToaster();
    const {
      questionsList,
      addSection,
      addInsightToSection
    } = useQuestionsData();

    const updatedInsight = computed(
      () => store.getters['insightPanel/updatedInsight']
    );

    const insightCache = new Map<string, any>();

    const annotation = ref<any>(null);
    const imagePreview = ref<string | null>(null);

    watch(
      () => [updatedInsight.value],
      async () => {
        // FIXME: updatedInsight can be a question, an insight, or null.
        // There is nothing to fetch for a question or null.
        if (!updatedInsight.value?.thumbnail) return;

        let cache = insightCache.get(updatedInsight.value.id);
        if (!cache) {
          const extras = await fetchPartialInsights({ id: updatedInsight.value.id }, ['id', 'annotation_state', 'image']);
          cache = extras[0];
          insightCache.set(updatedInsight.value.id, cache);
        }

        updatedInsight.value.image = cache.image;
        updatedInsight.value.annotation_state = cache.annotation_state;
        annotation.value = cache.annotation_state;
        imagePreview.value = null;
        nextTick(() => {
          imagePreview.value = cache.image;
        });
      },
      { immediate: true }
    );


    const insightsBySection = computed<SectionWithInsights[]>(
      () => store.getters['insightPanel/insightsBySection']
    );
    const positionInReview = computed<ReviewPosition | null>(() => store.getters['insightPanel/positionInReview']);

    const isInsight = computed(() => InsightUtil.instanceOfFullInsight(updatedInsight.value));

    const selectedInsightQuestions = ref<string[]>([]);
    const insightQuestionInnerLabel = ref(LBL_EMPTY_INSIGHT_QUESTION);
    const loadingImage = ref(false);
    const isEditingInsight = ref(false);

    const getQuestionById = (id: string) => {
      return questionsList.value.find(q => q.id === id);
    };

    const insightLinkedQuestionsCount = computed<string>(() => {
      if (updatedInsight.value && isInsight.value && updatedInsight.value.analytical_question.length > 0) {
        const linedQuestionsCount = (updatedInsight.value as Insight).analytical_question.length;
        if (linedQuestionsCount > 1) {
          return '+ ' + (linedQuestionsCount - 1).toString();
        }
      }
      return '';
    });

    const insightQuestionLabel = computed<string>(() => {
      if (
        isInsight.value &&
        updatedInsight.value.analytical_question.length === 0
      ) {
        // Current item is an insight that's not linked to any section.
        return '';
      }
      // Current item is an insight linked to one or more sections, or current
      //  item is a section itself, or we're in the process of making a new
      //  insight.
      const section = positionInReview.value
        ? getQuestionById(positionInReview.value.sectionId)
        : null;
      return section?.question ?? '';
    });

    watch(
      () => [
        questionsList.value,
        isEditingInsight.value
      ],
      () => {
        // if we are reviewing this insight in edit mode,
        //  it may have a current linking with some analytical question
        //  so we need to surface that
        if (
          updatedInsight.value &&
          isInsight.value
        ) {
          const initialSelection: string[] = [];
          updatedInsight.value.analytical_question.forEach((q: string) => {
            const questionObj = getQuestionById(q);
            if (questionObj) {
              initialSelection.push(questionObj.question);
            }
          });
          selectedInsightQuestions.value = initialSelection;
          if (initialSelection.length > 0) {
            insightQuestionInnerLabel.value = '';
          }
        }
      },
      {
        immediate: true // need to force updating the selected list when toggling the edit mode
      }
    );

    return {
      toaster,
      store,
      questionsList,
      addSection,
      addInsightToSection,
      updatedInsight,
      annotation,
      imagePreview,
      selectedInsightQuestions,
      insightQuestionInnerLabel,
      insightQuestionLabel,
      loadingImage,
      isInsight,
      insightLinkedQuestionsCount,
      isEditingInsight,
      insightsBySection,
      positionInReview,

      insightCache
    };
  },
  data: () => ({
    errorMsg: MSG_EMPTY_INSIGHT_NAME,
    drilldownTabs: METDATA_DRILLDOWN_TABS,
    showMetadataPanel: false,
    insightTitle: '',
    insightDesc: '',
    // imagePreview: null as string | null,
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
    showNewQuestion: false,
    messageNoData: INSIGHTS.NO_DATA
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
    isEditModeActive: {
      handler(/* newValue, oldValue */) {
        if (this.updatedInsight && this.isEditModeActive) {
          this.editInsight();
        }
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
            // if (this.markerAreaState) {
            //   nextTick(() => {
            //     const refAnnotatedImage = this.$refs.finalImagePreview as HTMLImageElement;
            //     refAnnotatedImage.src = this.originalImagePreview;
            //     this.annotateImage();
            //     (this.markerArea as MarkerArea).startRenderAndClose();
            //   });
            // }
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
        this.imagePreview = this.updatedInsight.image;
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
      snapshotUrl: 'insightPanel/snapshotUrl',
      projectMetadata: 'app/projectMetadata',
      currentPane: 'insightPanel/currentPane',
      isPanelOpen: 'insightPanel/isPanelOpen',
      countInsights: 'insightPanel/countInsights'
    }),
    isEditModeActive() {
      return this.currentPane === 'review-edit-insight';
    },
    isNewModeActive() {
      return this.currentPane === 'review-new-insight';
    },
    questionsDropdown() {
      return [...this.questionsList.map(q => q.question)];
    },
    nextSlide(): ReviewPosition | null {
      if (this.positionInReview === null) {
        // In the process of making a new insight.
        return null;
      }
      const { sectionId, insightId } = this.positionInReview;
      const sectionWithInsights = this.insightsBySection.find(
        _section => _section.section.id === sectionId
      );
      // If there's no section currently selected, return null;
      if (sectionWithInsights === undefined) {
        return null;
      }
      const insightIndex = sectionWithInsights.insights.findIndex(
        insight => insight.id === insightId
      );
      // If section has insights and current insight is not the last insight in
      //  the current section, go to the next insight in the current section.
      if (
        insightIndex !== sectionWithInsights.insights.length - 1 &&
        insightIndex !== -1
      ) {
        return {
          sectionId,
          insightId: sectionWithInsights.insights[insightIndex + 1].id as string
        };
      }
      // Otherwise, go to the next section
      const sectionIndex = this.insightsBySection.findIndex(
        _section => _section.section.id === sectionId
      );
      if (sectionIndex === this.insightsBySection.length - 1) {
        // Current section is last section
        return null;
      }
      const nextSectionWithInsights =
        this.insightsBySection[sectionIndex + 1];
      return nextSectionWithInsights.insights.length > 0
        // Go to first insight in next section
        ? {
            sectionId: nextSectionWithInsights.section.id as string,
            insightId: nextSectionWithInsights.insights[0].id as string
          }
        // Next section has no insights, so go to that section
        : {
            sectionId: nextSectionWithInsights.section.id as string,
            insightId: null
          };
    },
    previousSlide(): ReviewPosition | null {
      if (this.positionInReview === null) {
        // In the process of making a new insight.
        return null;
      }
      const { sectionId, insightId } = this.positionInReview;
      const sectionWithInsights = this.insightsBySection.find(
        _section => _section.section.id === sectionId
      );
      // If there's no section currently selected, return null;
      if (sectionWithInsights === undefined) {
        return null;
      }
      const insightIndex = sectionWithInsights.insights.findIndex(
        insight => insight.id === insightId
      );
      // If section has insights and current insight is not the first insight in
      //  the current section, go to the previous insight in the current
      //  section.
      if (insightIndex !== 0 && insightIndex !== -1) {
        return {
          sectionId: sectionId,
          insightId: sectionWithInsights.insights[insightIndex - 1].id as string
        };
      }
      // Otherwise, go to the previous section
      const sectionIndex = this.insightsBySection.findIndex(
        _section => _section.section.id === sectionId
      );
      if (sectionIndex === 0) {
        // Current section is the first section
        return null;
      }
      const previousSectionWithInsights =
        this.insightsBySection[sectionIndex - 1];
      return previousSectionWithInsights.insights.length > 0
        // Go to last insight in next section
        ? {
            sectionId: previousSectionWithInsights.section.id as string,
            insightId: previousSectionWithInsights.insights[previousSectionWithInsights.insights.length - 1].id as string
          }
        // Previous section has no insights, so go to that section
        : {
            sectionId: previousSectionWithInsights.section.id as string,
            insightId: null
          };
    },
    metadataDetails(): InsightMetadata {
      const dState: DataState | null = this.isNewModeActive || this.updatedInsight === null
        ? this.dataState
        : this.updatedInsight.data_state;
      const insightLastUpdate = this.isNewModeActive || this.updatedInsight === null
        ? undefined
        : this.updatedInsight.modified_at;
      const insightSummary = extractMetadataDetails(
        dState,
        this.projectMetadata,
        insightLastUpdate
      );
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
    },
    insightTargetView(): string[] {
      // an insight created during model publication should be listed either
      //  in the full list of insights,
      //  or as a context specific insight when opening the page of the corresponding model family instance
      return this.projectType === ProjectType.Analysis ? [this.currentView, 'overview', 'dataComparative'] : ['data', 'nodeDrilldown', 'dataComparative', 'overview', 'domainDatacubeOverview', 'modelPublisher'];
    }
    /*,
    annotation(): any {
      return this.updatedInsight ? this.updatedInsight.annotation_state : undefined;
    }
    */
  },
  async mounted() {
    if (this.isNewModeActive) {
      this.loadingImage = true;
      this.imagePreview = await this.takeSnapshot();
      this.loadingImage = false;
      this.showMetadataPanel = true;
      this.editInsight();
    }
    // else {
    //   if (this.updatedInsight) {
    //     this.imagePreview = this.updatedInsight.image;
    //   }
    // }
  },
  methods: {
    ...mapActions({
      setCurrentPane: 'insightPanel/setCurrentPane',
      showInsightPanel: 'insightPanel/showInsightPanel',
      setUpdatedInsight: 'insightPanel/setUpdatedInsight',
      setInsightsBySection: 'insightPanel/setInsightsBySection',
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      setCountInsights: 'insightPanel/setCountInsights',
      setPositionInReview: 'insightPanel/setPositionInReview',
      setShouldRefetchInsights: 'insightPanel/setShouldRefetchInsights'
    }),
    setInsightQuestions(questions: string[]) {
      this.selectedInsightQuestions = questions;
      this.insightQuestionInnerLabel = questions.length === 0 ? LBL_EMPTY_INSIGHT_QUESTION : '';
    },
    addNewQuestion(newQuestionText: string) {
      this.showNewQuestion = false;
      const handleSuccessfulAddition = () => {
        this.toaster(QUESTIONS.SUCCESSFUL_ADDITION, 'success', false);
        // FIXME: seems like there's a bug here. If we already have a section
        //  assigned to the insight and we add a new one, we want to append to
        //  the list, not replace it.
        this.setInsightQuestions([newQuestionText]);
      };
      const handleFailedAddition = () => {
        this.toaster(QUESTIONS.ERRONEOUS_ADDITION, 'error', true);
      };
      this.addSection(
        newQuestionText,
        handleSuccessfulAddition,
        handleFailedAddition
      );
    },
    async takeSnapshot() {
      const url = this.snapshotUrl;
      if (url) {
        const b64Str = await fetchImageAsBase64(url);
        if (b64Str) {
          return b64Str;
        }
        // otherwise, capture snapshot the usual way
      }
      const el = document.getElementsByClassName('insight-capture')[0] as HTMLElement;
      const image = _.isNil(el) ? null : (await html2canvas(el, { scale: 1 })).toDataURL();
      return image;
    },
    closeInsightReview() {
      if (this.isNewModeActive) {
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
      const insightIdToDelete = this.updatedInsight.id;
      // remove the insight from the server
      removeInsight(insightIdToDelete, this.store);

      // close editing before deleting insight (this will ensure annotation/crop mode is cleaned up)
      this.cancelInsightEdit();
      // remove this insight from each section that contains it in the store
      const filteredInsightsBySection = this.insightsBySection.map(
        ({ section, insights }) => ({
          section,
          insights: insights.filter(
            insight => insight.id !== insightIdToDelete
          )
        })
      );
      this.setInsightsBySection(filteredInsightsBySection);
      // Decide which slide to show next
      if (this.nextSlide && this.nextSlide.insightId !== insightIdToDelete) {
        this.goToNextSlide();
      } else if (
        this.previousSlide &&
        this.previousSlide.insightId !== insightIdToDelete
      ) {
        this.goToPreviousSlide();
      } else {
        // Either there are no more insights, or we're in an edge case where we
        //  just deleted an insight that is both the first insight of the next
        //  section, and the last insight of the previous section.
        // Either way, exit the review modal.
        this.setUpdatedInsight(null);
        this.showMetadataPanel = false;
      }
    },
    goToPreviousSlide() {
      if (this.isEditingInsight) {
        this.cancelInsightEdit();
      }
      this.setUpdatedInsight(
        InsightUtil.getSlideFromPosition(
          this.insightsBySection,
          this.previousSlide
        )
      );
      this.setPositionInReview(this.previousSlide);
    },
    goToNextSlide() {
      if (this.isEditingInsight) {
        this.cancelInsightEdit();
      }
      this.setUpdatedInsight(
        InsightUtil.getSlideFromPosition(
          this.insightsBySection,
          this.nextSlide
        )
      );
      this.setPositionInReview(this.nextSlide);
    },
    editInsight() {
      this.isEditingInsight = true;
      // save current insight name/desc in case the user cancels the edit action
      this.insightTitle = this.isNewModeActive ? '' : this.updatedInsight.name;
      this.insightDesc = this.isNewModeActive ? '' : this.updatedInsight.description;
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

      if (this.isNewModeActive || this.updatedInsight === null) {
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

      const linkedQuestions = this.questionsList.filter(q => this.selectedInsightQuestions.includes(q.question));

      if (this.isNewModeActive) {
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
          analytical_question: linkedQuestions.map(q => q.id as string),
          image: insightThumbnail,
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
              if (linkedQuestions) {
                const insightId = result.data.id;
                linkedQuestions.forEach(section => {
                  this.addInsightToSection(insightId, section.id as string);
                });
              }
            } else {
              this.toaster(message, 'error', true);
            }
            this.closeInsightReview();
            this.setShouldRefetchInsights(true);
          }).catch(() => {
            // just in case the call to the server fails
            this.closeInsightReview();
          });
      } else {
        // saving an existing insight
        if (this.updatedInsight) {
          // Invalidate cache
          this.insightCache.delete(this.updatedInsight.id);

          const updatedInsight = this.updatedInsight;
          updatedInsight.name = this.insightTitle;
          updatedInsight.description = this.insightDesc;
          updatedInsight.image = insightThumbnail;
          updatedInsight.annotation_state = annotationAndCropState;
          updatedInsight.analytical_question = linkedQuestions.map(q => q.id as string);
          updateInsight(this.updatedInsight.id, updatedInsight)
            .then((result) => {
              if (result.updated === 'success') {
                this.toaster(INSIGHTS.SUCCESSFUL_UPDATE, 'success', false);

                // ensure when updating an insight to also update its linked questions
                const insightId = this.updatedInsight.id;
                linkedQuestions.forEach(q => {
                  if (!q.linked_insights.includes(insightId)) {
                    q.linked_insights.push(insightId);
                    updateQuestion(q.id as string, q);
                  }
                });
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
    async exportInsight(exportType: string) {
      const cagMap = InsightUtil.getCagMapFromInsights([this.updatedInsight]);
      const bibliographyMap = await getBibiographyFromCagIds([...cagMap.keys()]);

      switch (exportType) {
        case 'Word':
          InsightUtil.exportDOCX([this.updatedInsight], this.projectMetadata, undefined, bibliographyMap);
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
    .other-question-title {
      font-size: 2rem;
      color: darkgray;
      padding-left: 1rem;
      padding-right: 1rem;
      border-style: solid;
      border-radius: 50%;
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

  :deep(.dropdown-btn) {
    width: 100%;
    justify-content: space-between;
  }
  :deep(.dropdown-container) {
    width: 100%;
  }
}

</style>

