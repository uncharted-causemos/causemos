<template>
  <div class="new-insight-modal-container">
    <rename-modal
      v-if="showNewQuestion"
      :current-name="''"
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
        <button type="button" class="btn" @click="annotateImage">Annotate</button>
        <button type="button" class="btn" @click="cropImage">Crop</button>
        <button class="btn btn-extra-margin" @click="cancelInsightEdit">Cancel</button>
        <button
          :disabled="isInsightTitleInvalid"
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
            @click="showMetadataPanel = !showMetadataPanel"
          >
            <i class="fa fa-info" />
          </button>
          <button
            v-if="updatedInsight !== null"
            type="button"
            class="btn"
            v-tooltip="'Jump to live context'"
            :disabled="!isInsight"
            @click="jumpToLiveContext"
          >
            <i class="fa fa-level-up" />
          </button>
          <div class="export" v-if="updatedInsight !== null">
            <span>Export insight as</span>
            <button class="btn" @click="() => exportInsight('Powerpoint')">PowerPoint</button>
            <button class="btn" @click="() => exportInsight('Word')">Word</button>
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
          <div style="display: flex; align-items: baseline">
            <template v-if="!isEditingInsight">
              <div class="question-title">{{ insightQuestionLabel }}</div>
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
            <div v-if="!isEditingInsight" class="title">{{ previewInsightTitle }}</div>
            <input
              v-else
              v-model="insightTitle"
              v-focus
              type="text"
              class="form-control"
              placeholder="Untitled insight name"
            />
            <div v-if="isEditingInsight && isInsightTitleInvalid" class="error-msg">
              {{ errorMsg }}
            </div>
            <div v-if="!isEditingInsight" class="desc">{{ previewInsightDesc }}</div>
            <textarea
              v-else
              v-model="insightDesc"
              :rows="2"
              class="form-control"
              placeholder="Untitled insight description"
            />
            <div class="image-preview-and-metadata">
              <div v-if="imagePreview !== null" class="preview">
                <img id="finalImagePreview" ref="finalImagePreview" :src="imagePreview" />
                <div v-if="showCropInfoMessage" style="align-self: center">
                  Annotations are still there, but not shown when the image is being cropped!
                </div>
              </div>
              <div v-else style="width: 100%">
                <div v-if="loadingImage" style="text-align: center; font-size: x-large">
                  <i class="fa fa-spin fa-spinner" /> Loading image ...
                </div>
                <disclaimer
                  v-else
                  style="text-align: center; color: black"
                  :message="
                    updatedInsight === null
                      ? 'No more insights available to preview!'
                      : 'No image preview!'
                  "
                />
              </div>
              <insight-summary
                v-if="metadataDetails"
                :metadata-details="metadataDetails"
                class="insight-summary"
              />
            </div>
          </template>
          <template v-else>
            <message-display class="pane-content" :message="messageNoData" />
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

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import Disclaimer from '@/components/widgets/disclaimer.vue';
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header.vue';
import { useStore } from 'vuex';
import InsightUtil, {
  INSIGHT_CAPTURE_CLASS,
  getModelOrDatasetStateViewFromRoute,
} from '@/utils/insight-util';
import {
  Insight,
  InsightMetadata,
  FullInsight,
  DataState,
  SectionWithInsights,
  ReviewPosition,
  AnalyticalQuestion,
  NewInsight,
  ModelOrDatasetStateInsight,
  ModelOrDatasetStateView,
} from '@/types/Insight';
import {
  addInsight,
  updateInsight,
  fetchPartialInsights,
  extractMetadataDetails,
  removeInsight as insightServiceRemoveInsight,
} from '@/services/insight-service';
import { INSIGHTS, QUESTIONS } from '@/utils/messages-util';
import useToaster from '@/composables/useToaster';
import useInsightAnnotation from '@/composables/useInsightAnnotation';
import html2canvas from 'html2canvas';
import _ from 'lodash';
import InsightSummary from './insight-summary.vue';
import DropdownButton from '@/components/dropdown-button.vue';
import SmallTextButton from '@/components/widgets/small-text-button.vue';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import { updateQuestion } from '@/services/question-service';
import useQuestionsData from '@/composables/useQuestionsData';
import MessageDisplay from '@/components/widgets/message-display.vue';
import { fetchImageAsBase64 } from '@/services/datacube-service';
import { getBibiographyFromCagIds } from '@/services/bibliography-service';
import { TYPE } from 'vue-toastification';
import { useRoute, useRouter } from 'vue-router';
import useInsightStore from '@/composables/useInsightStore';
import { ModelOrDatasetState } from '@/types/Datacube';

const MSG_EMPTY_INSIGHT_NAME = 'Insight name cannot be blank';
const LBL_EMPTY_INSIGHT_NAME = '<Insight title missing...>';
const LBL_EMPTY_INSIGHT_QUESTION = 'Add to Analysis Checklist section';

const store = useStore();
const toaster = useToaster();
const { questionsList, addSection, addInsightToSection, getQuestionsThatIncludeInsight } =
  useQuestionsData();

const updatedInsight = computed<null | Insight | FullInsight | AnalyticalQuestion | NewInsight>(
  () => store.getters['insightPanel/updatedInsight']
);
const isInsight = computed(() => InsightUtil.instanceOfInsight(updatedInsight.value));

const insightCache = new Map<string, any>();

const imagePreview = ref<string | null>(null);
watch(
  () => [updatedInsight.value],
  async () => {
    // UpdatedInsight can be a question, an insight, or null.
    // There is nothing to fetch for a question or null.
    const _updatedInsight = updatedInsight.value;
    if (!InsightUtil.instanceOfInsight(_updatedInsight) || _updatedInsight.id === undefined) return;

    let cache = insightCache.get(_updatedInsight.id);
    if (!cache) {
      const extras = await fetchPartialInsights({ id: _updatedInsight.id }, [
        'id',
        'annotation_state',
        'image',
      ]);
      cache = extras[0];
      insightCache.set(_updatedInsight.id, cache);
    }

    (updatedInsight.value as FullInsight | NewInsight).image = cache.image;
    (updatedInsight.value as FullInsight | NewInsight).annotation_state = cache.annotation_state;
    setAnnotation(cache.annotation_state);
    imagePreview.value = null;
    nextTick(() => {
      imagePreview.value = cache.image;
    });
  },
  { immediate: true }
);
// every time the user navigates to a new insight (or removes the current insight), re-fetch the image
// NOTE: imagePreview ideally could be a computed prop, but when in newMode the image is fetched differently
//       plus once imagePreview is assigned its watch will apply-annotation insight if any
watch(updatedInsight, (_updatedInsight) => {
  imagePreview.value = _updatedInsight ? (_updatedInsight as FullInsight | NewInsight).image : null;
});

const {
  finalImagePreview,
  onCancelEdit,
  cropImage,
  annotateImage,
  showCropInfoMessage,
  annotationAndCropState,
  insightThumbnail,
  setAnnotation,
} = useInsightAnnotation(imagePreview);

const insightsBySection = computed<SectionWithInsights[]>(
  () => store.getters['insightPanel/insightsBySection']
);
const positionInReview = computed<ReviewPosition | null>(
  () => store.getters['insightPanel/positionInReview']
);

const selectedInsightQuestions = ref<string[]>([]);
const insightQuestionInnerLabel = computed(() =>
  selectedInsightQuestions.value.length === 0 ? LBL_EMPTY_INSIGHT_QUESTION : ''
);
const loadingImage = ref(false);
const isEditingInsight = ref(false);
const insightTitle = ref('');
const insightDesc = ref('');

const editInsight = () => {
  isEditingInsight.value = true;
  // save current insight name/desc in case the user cancels the edit action
  const _updatedInsight = updatedInsight.value;
  // ASSUMPTION: If we're saving a new insight, updatedInsight will be `null`.
  //  So title and description should be set to ''
  insightTitle.value = InsightUtil.instanceOfInsight(_updatedInsight) ? _updatedInsight.name : '';
  insightDesc.value = InsightUtil.instanceOfInsight(_updatedInsight)
    ? _updatedInsight.description ?? ''
    : '';
};

const getQuestionById = (id: string) => {
  return questionsList.value.find((q) => q.id === id);
};

const insightQuestionLabel = computed<string>(() => {
  const _updatedInsight = updatedInsight.value;
  const questionsThatContainThisInsight =
    _updatedInsight !== null ? getQuestionsThatIncludeInsight(_updatedInsight.id as string) : [];
  if (
    InsightUtil.instanceOfInsight(_updatedInsight) &&
    questionsThatContainThisInsight.length === 0
  ) {
    // Current item is an insight that's not linked to any section.
    return '';
  }
  // Current item is an insight linked to one or more sections, or current
  //  item is a section itself, or we're in the process of making a new
  //  insight.
  const section = positionInReview.value ? getQuestionById(positionInReview.value.sectionId) : null;
  return section?.question ?? '';
});

// When we start editing a node or load the list of questions, initialize the
//  list of selected questions.
watch(
  [questionsList, isEditingInsight],
  () => {
    const _updatedInsight = updatedInsight.value;
    if (InsightUtil.instanceOfInsight(_updatedInsight)) {
      selectedInsightQuestions.value = getQuestionsThatIncludeInsight(
        _updatedInsight.id as string
      ).map(({ question }) => question);
    }
  },
  { immediate: true }
);

const errorMsg = ref(MSG_EMPTY_INSIGHT_NAME);
const showMetadataPanel = ref(false);

const showNewQuestion = ref(false);
const messageNoData = ref(INSIGHTS.NO_DATA);

const currentPane = computed(() => store.getters['insightPanel/currentPane']);
const setCurrentPane = (newPane: string) => store.dispatch('insightPanel/setCurrentPane', newPane);
const isNewModeActive = computed(() => currentPane.value === 'review-new-insight');
const isEditModeActive = computed(() => currentPane.value === 'review-edit-insight');
watch(
  isEditModeActive,
  () => {
    if (updatedInsight.value && isEditModeActive.value) {
      editInsight();
    }
  },
  { immediate: true }
);

const project = computed(() => store.getters['app/project']);
const dataState = computed(() => store.getters['insightPanel/dataState']);
const viewState = computed(() => store.getters['insightPanel/viewState']);
const contextId = computed(() => store.getters['insightPanel/contextId']);
const snapshotUrl = computed(() => store.getters['insightPanel/snapshotUrl']);
const projectMetadata = computed(() => store.getters['app/projectMetadata']);

const questionsDropdown = computed(() => [...questionsList.value.map((q) => q.question)]);

const nextSlide = computed<ReviewPosition | null>(() => {
  if (positionInReview.value === null) {
    // In the process of making a new insight.
    return null;
  }
  const { sectionId, insightId } = positionInReview.value;
  const sectionWithInsights = insightsBySection.value.find(
    (_section) => _section.section.id === sectionId
  );
  // If there's no section currently selected, return null;
  if (sectionWithInsights === undefined) {
    return null;
  }
  const insightIndex = sectionWithInsights.insights.findIndex(
    (insight) => insight.id === insightId
  );
  // If section has insights and current insight is not the last insight in
  //  the current section, go to the next insight in the current section.
  if (insightIndex !== sectionWithInsights.insights.length - 1 && insightIndex !== -1) {
    return {
      sectionId,
      insightId: sectionWithInsights.insights[insightIndex + 1].id as string,
    };
  }
  // Otherwise, go to the next section
  const sectionIndex = insightsBySection.value.findIndex(
    (_section) => _section.section.id === sectionId
  );
  if (sectionIndex === insightsBySection.value.length - 1) {
    // Current section is last section
    return null;
  }
  const nextSectionWithInsights = insightsBySection.value[sectionIndex + 1];
  return nextSectionWithInsights.insights.length > 0
    ? // Go to first insight in next section
      {
        sectionId: nextSectionWithInsights.section.id as string,
        insightId: nextSectionWithInsights.insights[0].id as string,
      }
    : // Next section has no insights, so go to that section
      {
        sectionId: nextSectionWithInsights.section.id as string,
        insightId: null,
      };
});

const previousSlide = computed<ReviewPosition | null>(() => {
  if (positionInReview.value === null) {
    // In the process of making a new insight.
    return null;
  }
  const { sectionId, insightId } = positionInReview.value;
  const sectionWithInsights = insightsBySection.value.find(
    (_section) => _section.section.id === sectionId
  );
  // If there's no section currently selected, return null;
  if (sectionWithInsights === undefined) {
    return null;
  }
  const insightIndex = sectionWithInsights.insights.findIndex(
    (insight) => insight.id === insightId
  );
  // If section has insights and current insight is not the first insight in
  //  the current section, go to the previous insight in the current
  //  section.
  if (insightIndex !== 0 && insightIndex !== -1) {
    return {
      sectionId,
      insightId: sectionWithInsights.insights[insightIndex - 1].id as string,
    };
  }
  // Otherwise, go to the previous section
  const sectionIndex = insightsBySection.value.findIndex(
    (_section) => _section.section.id === sectionId
  );
  if (sectionIndex === 0) {
    // Current section is the first section
    return null;
  }
  const previousSectionWithInsights = insightsBySection.value[sectionIndex - 1];
  return previousSectionWithInsights.insights.length > 0
    ? // Go to last insight in next section
      {
        sectionId: previousSectionWithInsights.section.id as string,
        insightId: previousSectionWithInsights.insights[
          previousSectionWithInsights.insights.length - 1
        ].id as string,
      }
    : // Previous section has no insights, so go to that section
      {
        sectionId: previousSectionWithInsights.section.id as string,
        insightId: null,
      };
});

const metadataDetails = computed<InsightMetadata>(() => {
  const _updatedInsight = updatedInsight.value;
  const dState: DataState | null =
    isNewModeActive.value ||
    !InsightUtil.instanceOfInsight(_updatedInsight) ||
    InsightUtil.instanceOfNewInsight(_updatedInsight)
      ? dataState.value
      : _updatedInsight.data_state;
  const insightLastUpdate =
    isNewModeActive.value || !InsightUtil.instanceOfInsight(_updatedInsight)
      ? undefined
      : _updatedInsight.modified_at;
  const insightSummary = extractMetadataDetails(dState, projectMetadata.value, insightLastUpdate);
  return insightSummary;
});
const previewInsightTitle = computed(() => {
  if (loadingImage.value) return '';
  const _updatedInsight = updatedInsight.value;
  return InsightUtil.instanceOfInsight(_updatedInsight) && _updatedInsight.name.length > 0
    ? _updatedInsight.name
    : LBL_EMPTY_INSIGHT_NAME;
});
const previewInsightDesc = computed(() => {
  if (loadingImage.value) return '';
  return updatedInsight.value?.description && updatedInsight.value.description.length > 0
    ? updatedInsight.value.description
    : '<Insight description missing...>';
});

const takeSnapshot = async () => {
  const url = snapshotUrl.value;
  if (url) {
    const b64Str = await fetchImageAsBase64(url);
    if (b64Str) {
      return b64Str;
    }
    // otherwise, capture snapshot the usual way
  }
  const el = document.getElementsByClassName(INSIGHT_CAPTURE_CLASS)[0] as HTMLElement;
  const image = _.isNil(el) ? null : (await html2canvas(el, { scale: 1 })).toDataURL();
  return image;
};
onMounted(async () => {
  if (isNewModeActive.value) {
    loadingImage.value = true;
    imagePreview.value = await takeSnapshot();
    loadingImage.value = false;
    showMetadataPanel.value = true;
    editInsight();
  }
});
const { setUpdatedInsight, setInsightsBySection, showInsightPanel, modelOrDatasetState } =
  useInsightStore();
const hideInsightPanel = () => store.dispatch('insightPanel/hideInsightPanel');

const setShouldRefetchInsights = (newValue: boolean) =>
  store.dispatch('insightPanel/setShouldRefetchInsights', newValue);

const setInsightQuestions = (questions: string[]) => {
  selectedInsightQuestions.value = questions;
};

const addNewQuestion = (newQuestionText: string) => {
  showNewQuestion.value = false;
  const handleSuccessfulAddition = () => {
    toaster(QUESTIONS.SUCCESSFUL_ADDITION, TYPE.SUCCESS, false);
    // FIXME: seems like there's a bug here. If we already have a section
    //  assigned to the insight and we add a new one, we want to append to
    //  the list, not replace it.
    setInsightQuestions([newQuestionText]);
  };
  const handleFailedAddition = () => {
    toaster(QUESTIONS.ERRONEOUS_ADDITION, TYPE.INFO, true);
  };
  addSection(newQuestionText, handleSuccessfulAddition, handleFailedAddition);
};

const closeInsightReview = () => {
  if (isNewModeActive.value) {
    hideInsightPanel();
    setCurrentPane('');
  } else {
    if (updatedInsight.value) {
      cancelInsightEdit();
    }
    showInsightPanel();
    setCurrentPane('list-insights');
  }
};

const removeInsight = () => {
  // before deletion, find the index of the insight to be removed
  const insightIdToDelete = updatedInsight.value?.id;
  if (insightIdToDelete === undefined) return;
  // remove the insight from the server
  insightServiceRemoveInsight(insightIdToDelete);

  // close editing before deleting insight (this will ensure annotation/crop mode is cleaned up)
  cancelInsightEdit();
  // remove this insight from each section that contains it in the store
  const filteredInsightsBySection = insightsBySection.value.map(({ section, insights }) => ({
    section,
    insights: insights.filter((insight) => insight.id !== insightIdToDelete),
  }));
  setInsightsBySection(filteredInsightsBySection);
  // Decide which slide to show next
  if (nextSlide.value && nextSlide.value.insightId !== insightIdToDelete) {
    goToNextSlide();
  } else if (previousSlide.value && previousSlide.value.insightId !== insightIdToDelete) {
    goToPreviousSlide();
  } else {
    // Either there are no more insights, or we're in an edge case where we
    //  just deleted an insight that is both the first insight of the next
    //  section, and the last insight of the previous section.
    // Either way, exit the review modal.
    setUpdatedInsight(null);
    showMetadataPanel.value = false;
    closeInsightReview();
  }
};

const setPositionInReview = (newPosition: ReviewPosition | null) =>
  store.dispatch('insightPanel/setPositionInReview', newPosition);
const goToPreviousSlide = () => {
  if (isEditingInsight.value) {
    cancelInsightEdit();
  }
  setUpdatedInsight(InsightUtil.getSlideFromPosition(insightsBySection.value, previousSlide.value));
  setPositionInReview(previousSlide.value);
};
const goToNextSlide = () => {
  if (isEditingInsight.value) {
    cancelInsightEdit();
  }
  setUpdatedInsight(InsightUtil.getSlideFromPosition(insightsBySection.value, nextSlide.value));
  setPositionInReview(nextSlide.value);
};
const cancelInsightEdit = () => {
  isEditingInsight.value = false;
  insightTitle.value = '';
  onCancelEdit();
  if (isNewModeActive.value || updatedInsight.value === null) {
    closeInsightReview();
  }
};
const confirmInsightEdit = () => {
  isEditingInsight.value = false;

  // save the updated insight in the backend
  saveInsight();
};
const route = useRoute();

const isInsightTitleInvalid = computed(
  () => insightTitle.value.trim().length === 0 || insightTitle.value === LBL_EMPTY_INSIGHT_NAME
);
const saveInsight = () => {
  if (isInsightTitleInvalid.value) return;

  const linkedQuestions = questionsList.value.filter((q) =>
    selectedInsightQuestions.value.includes(q.question)
  );

  if (isNewModeActive.value) {
    // saving a new insight
    const url = route.fullPath;

    let newInsight: FullInsight | ModelOrDatasetStateInsight = {
      name: insightTitle.value,
      description: insightDesc.value,
      project_id: project.value,
      context_id: contextId.value,
      url,
      is_default: true,
      image: insightThumbnail.value ?? '',
      annotation_state: annotationAndCropState.value,
      view_state: viewState.value,
      data_state: dataState.value,
    };

    // FIXME: HACK: determine whether we should use the new insight schema depending on the route
    //  name that the new insight was taken from
    if (['modelDrilldown', 'datasetDrilldown'].includes(route.name as string)) {
      const newModelOrDatasetStateInsight: ModelOrDatasetStateInsight = {
        schemaVersion: 2,
        id: uuidv4(),
        name: insightTitle.value,
        description: insightDesc.value,
        project_id: project.value,
        image: insightThumbnail.value ?? '',
        annotation_state: annotationAndCropState.value,
        type: 'ModelOrDatasetStateInsight',
        // ASSUMPTION: view is not null
        view: getModelOrDatasetStateViewFromRoute(route) as ModelOrDatasetStateView,
        context_id: contextId.value,
        // ASSUMPTION: state has been set before the new insight flow began, so modelOrDatasetState
        //  is not null
        state: modelOrDatasetState.value as ModelOrDatasetState,
      };
      newInsight = newModelOrDatasetStateInsight;
    }

    addInsight(newInsight)
      .then((result) => {
        const message =
          result.status === 200 ? INSIGHTS.SUCCESSFUL_ADDITION : INSIGHTS.ERRONEOUS_ADDITION;
        if (message === INSIGHTS.SUCCESSFUL_ADDITION) {
          toaster(message, TYPE.SUCCESS, false);

          // after the insight is created and have a valid id, we need to link that to the question
          if (linkedQuestions) {
            const insightId = result.data.id;
            linkedQuestions.forEach((section) => {
              addInsightToSection(insightId, section.id as string);
            });
          }
        } else {
          toaster(message, TYPE.INFO, true);
        }
        closeInsightReview();
        setShouldRefetchInsights(true);
      })
      .catch(() => {
        // just in case the call to the server fails
        closeInsightReview();
      });
  } else {
    // saving an existing insight
    const insightId = updatedInsight.value?.id;
    if (updatedInsight.value && insightId) {
      // Invalidate cache
      insightCache.delete(insightId);

      const _updatedInsight = updatedInsight.value as FullInsight | NewInsight;
      _updatedInsight.name = insightTitle.value;
      _updatedInsight.description = insightDesc.value;
      _updatedInsight.image = insightThumbnail.value ?? '';
      _updatedInsight.annotation_state = annotationAndCropState.value;
      updateInsight(insightId, _updatedInsight).then((result) => {
        if (result.updated === 'success') {
          toaster(INSIGHTS.SUCCESSFUL_UPDATE, TYPE.SUCCESS, false);

          // ensure when updating an insight to also update its linked questions
          linkedQuestions.forEach((q) => {
            if (!q.linked_insights.includes(insightId)) {
              q.linked_insights.push(insightId);
              updateQuestion(q.id as string, q);
            }
          });
        } else {
          toaster(INSIGHTS.ERRONEOUS_UPDATE, TYPE.INFO, true);
        }
      });
    }
  }
};

const router = useRouter();
const jumpToLiveContext = () => {
  const insight = updatedInsight.value as Insight | NewInsight;
  const currentURL = route.fullPath;
  const finalURL = InsightUtil.jumpToInsightContext(insight, currentURL);
  if (finalURL) {
    router.push(finalURL);
  } else {
    router
      .push({
        query: {
          insight_id: insight.id,
        },
      })
      .catch(() => {});
  }
  hideInsightPanel();
};
const exportInsight = async (exportType: 'Powerpoint' | 'Word') => {
  const bibliographyMap = await getBibiographyFromCagIds([]);
  if (exportType === 'Word') {
    InsightUtil.exportDOCX(
      [updatedInsight.value as FullInsight | NewInsight],
      projectMetadata.value,
      undefined,
      bibliographyMap
    );
  } else {
    InsightUtil.exportPPTX(
      [updatedInsight.value as FullInsight | NewInsight],
      projectMetadata.value
    );
  }
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.insight-edit-controls {
  display: flex;
  gap: 5px;
}

.btn-extra-margin {
  margin-left: 5px;
}

.btn-delete {
  margin-left: 10px;
  &,
  &:hover {
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

  :deep(.dropdown-btn) {
    width: 100%;
    justify-content: space-between;
  }
  :deep(.dropdown-container) {
    width: 100%;
  }
}

.insight-summary {
  background: white;
  width: 400px;
  padding: 20px;
}
</style>
