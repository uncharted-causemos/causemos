<script setup lang="ts">
import useInsightAnnotation from '@/composables/useInsightAnnotation';
import useInsightStore from '@/composables/useInsightStore';
import useToaster from '@/composables/useToaster';
import {
  addInsight,
  extractMetadataDetails,
  fetchFullInsights,
  updateInsight,
} from '@/services/insight-service';
import { updateQuestion } from '@/services/question-service';
import {
  AnalyticalQuestion,
  AnnotationState,
  DataState,
  FullInsight,
  InsightMetadata,
  ModelOrDatasetStateView,
  NewInsight,
  UnpersistedInsight,
} from '@/types/Insight';
import insightUtil, {
  getModelOrDatasetStateViewFromRoute,
  INSIGHT_CAPTURE_CLASS,
} from '@/utils/insight-util';
import { INSIGHTS, QUESTIONS } from '@/utils/messages-util';
import html2canvas from 'html2canvas';
import _ from 'lodash';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Textarea from 'primevue/textarea';
import { computed, ref, toRefs, watch } from 'vue';
import { TYPE } from 'vue-toastification';
import { useRoute } from 'vue-router';
import { ModelOrDatasetState } from '@/types/Datacube';
import { useStore } from 'vuex';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import InsightSummary from './insight-summary.vue';
import useInsightManager from '@/composables/useInsightManager';

const props = defineProps<{
  insightId: string | null;
  questionsList: AnalyticalQuestion[];
}>();
const { insightId, questionsList } = toRefs(props);
const emit = defineEmits<{
  (e: 'cancel-editing-insight'): void;
  (e: 'refresh-questions-and-insights'): void;
  (
    e: 'add-question',
    newQuestionText: string,
    onSuccess: (newQuestionId: string) => void,
    onFail: () => void
  ): void;
}>();

const isCreatingInsight = computed(() => insightId.value === null);

const takeSnapshot = async () => {
  const el = document.getElementsByClassName(INSIGHT_CAPTURE_CLASS)[0];
  const image = _.isNil(el)
    ? null
    : (await html2canvas(el as HTMLElement, { scale: 1 })).toDataURL();
  return image;
};

const questionDropdownItems = computed(() => [
  ...questionsList.value.map((q) => ({ id: q.id as string, title: q.question })),
]);
const assignedQuestionIds = ref<string[]>([]);
// When questions are first loaded (previousQuestionsList is undefined),
//  initialize the list of assigned questions to the questions that are linked
//  to the current insight.
watch(
  questionsList,
  (questions, previousQuestionsList) => {
    if (previousQuestionsList !== undefined) {
      return;
    }
    assignedQuestionIds.value = questions
      .filter((question) => question.linked_insights.includes(insightId.value as string))
      .map((q) => q.id as string);
  },
  { immediate: true }
);
const isAddingNewQuestion = ref(false);
const addNewQuestion = (newQuestionText: string) => {
  isAddingNewQuestion.value = false;
  const onSuccess = (newQuestionId: string) => {
    // Append new question to the list of selected questions
    assignedQuestionIds.value = [...assignedQuestionIds.value, newQuestionId];
  };
  const onFail = () => {
    toaster(QUESTIONS.ERRONEOUS_ADDITION, TYPE.INFO, true);
  };
  emit('add-question', newQuestionText, onSuccess, onFail);
};

const savedInsightState = ref<UnpersistedInsight | FullInsight | NewInsight | null>(null);
const insightTitle = ref<string>('');
watch(
  savedInsightState,
  (insight) => {
    insightTitle.value = insight?.name || '';
  },
  { immediate: true }
);
const description = ref<string>('');
watch(
  savedInsightState,
  (insight) => {
    description.value = insight?.description || '';
  },
  { immediate: true }
);

const savedInsightImage = computed(() => savedInsightState.value?.image ?? null);

const route = useRoute();
// TODO: remove dependence on store
const store = useStore();
const project = computed(() => store.getters['app/project']);
const contextId = computed(() => store.getters['insightPanel/contextId']);
const { getDataState, getViewState, modelOrDatasetState } = useInsightStore();
watch(
  insightId,
  async (id) => {
    if (id !== null) {
      // TODO: check for race conditions
      savedInsightState.value = (await fetchFullInsights({ id }, true))[0];
      return;
    }
    // If insightId is null we're creating a new insight
    const snapshotImage = (await takeSnapshot()) ?? '';
    const url = route.fullPath;
    const annotationState: AnnotationState = {
      markerAreaState: undefined,
      cropAreaState: undefined,
      imagePreview: snapshotImage,
      originalImagePreview: snapshotImage,
    };
    // FIXME: HACK: determine whether we should use the new insight schema depending on the route
    //  name that the new insight was taken from
    if (['modelDrilldown', 'datasetDrilldown'].includes(route.name as string)) {
      const newModelOrDatasetStateInsight: UnpersistedInsight = {
        schemaVersion: 2,
        name: '',
        description: '',
        project_id: project.value,
        image: snapshotImage,
        annotation_state: annotationState,
        type: 'ModelOrDatasetStateInsight',
        // ASSUMPTION: view is not null
        view: getModelOrDatasetStateViewFromRoute(route) as ModelOrDatasetStateView,
        context_id: contextId.value,
        // ASSUMPTION: state has been set before the new insight flow began, so modelOrDatasetState
        //  is not null
        state: modelOrDatasetState.value as ModelOrDatasetState,
      };
      savedInsightState.value = newModelOrDatasetStateInsight;
    } else {
      // Old insight schema
      const newInsight: UnpersistedInsight = {
        name: '',
        description: '',
        project_id: project.value,
        context_id: contextId.value,
        url,
        image: snapshotImage,
        annotation_state: annotationState,
        view_state: getViewState(),
        data_state: getDataState(),
      };
      savedInsightState.value = newInsight;
    }
  },
  { immediate: true }
);

const {
  imageElementRef,
  cropImage,
  annotateImage,
  annotationAndCropState,
  insightThumbnail,
  activeOperation,
} = useInsightAnnotation(savedInsightState);

const { showInsightList } = useInsightManager();
const closeInsightReview = () => {
  showInsightList();
};
const stopEditingInsight = () => {
  emit('cancel-editing-insight');
};

const isInsightTitleInvalid = computed(() => insightTitle.value.trim().length === 0);
const toaster = useToaster();
const saveInsight = async () => {
  const previouslyCreatedInsightId = insightId.value;
  if (isInsightTitleInvalid.value || savedInsightState.value === undefined) return;

  const currentlyAssignedQuestions =
    previouslyCreatedInsightId === null
      ? []
      : questionsList.value.filter((q) => q.linked_insights.includes(previouslyCreatedInsightId));
  const updatedAssignedQuestions = questionsList.value.filter((q) =>
    assignedQuestionIds.value.includes(q.id as string)
  );
  const newAssignedQuestions = updatedAssignedQuestions.filter(
    (q) => !currentlyAssignedQuestions.includes(q)
  );
  const removedAssignedQuestions = currentlyAssignedQuestions.filter(
    (q) => !updatedAssignedQuestions.includes(q)
  );

  const updatedInsight = { ...(savedInsightState.value as FullInsight | NewInsight) };
  updatedInsight.name = insightTitle.value;
  updatedInsight.description = description.value;
  updatedInsight.image = insightThumbnail.value ?? '';
  updatedInsight.annotation_state = annotationAndCropState.value;

  let id = '';
  if (previouslyCreatedInsightId === null) {
    // Create a new insight
    const result = await addInsight(updatedInsight);
    const message =
      result.status === 200 ? INSIGHTS.SUCCESSFUL_ADDITION : INSIGHTS.ERRONEOUS_ADDITION;
    if (message === INSIGHTS.SUCCESSFUL_ADDITION) {
      toaster(message, TYPE.SUCCESS, false);
      id = result.data.id;
    } else {
      toaster(message, TYPE.INFO, true);
    }
  } else {
    // Update an existing insight
    const result = await updateInsight(previouslyCreatedInsightId, updatedInsight);
    if (result.updated !== 'success') {
      toaster(INSIGHTS.ERRONEOUS_UPDATE, TYPE.INFO, true);
      return;
    }
    toaster(INSIGHTS.SUCCESSFUL_UPDATE, TYPE.SUCCESS, false);
    id = previouslyCreatedInsightId;
  }
  const promises = [
    // Add the insight to the questions it's now assigned to
    ...newAssignedQuestions.map((q) => {
      q.linked_insights.push(id);
      return updateQuestion(q.id as string, q);
    }),
    // Remove the insight from the questions it's no longer assigned to
    ...removedAssignedQuestions.map((q) => {
      q.linked_insights = q.linked_insights.filter((i) => i !== id);
      return updateQuestion(q.id as string, q);
    }),
  ];
  await Promise.all(promises);
  emit('refresh-questions-and-insights');
  if (previouslyCreatedInsightId === null) {
    closeInsightReview();
  } else {
    stopEditingInsight();
  }
};

const metadataDetails = computed<InsightMetadata | null>(() => {
  if (savedInsightState.value === null) return null;
  const insight = savedInsightState.value as FullInsight | NewInsight;
  const dataState: DataState | null = insightUtil.instanceOfNewInsight(insight)
    ? insight.state
    : insight.data_state;
  const insightLastUpdate = !insightUtil.instanceOfInsight(insight)
    ? undefined
    : insight.modified_at;
  const insightSummary = extractMetadataDetails(dataState, insightLastUpdate);
  return insightSummary;
});
</script>

<template>
  <div class="insight-edit-modal-container">
    <RenameModal
      v-if="isAddingNewQuestion"
      :current-name="''"
      :modal-title="'Add a new question'"
      @confirm="addNewQuestion"
      @cancel="isAddingNewQuestion = false"
    />
    <nav v-if="!isCreatingInsight">
      <Button text label="All Insights" @click="closeInsightReview" severity="secondary" />
      <i class="fa fa-caret-right" />
      <Button text label="Review Insights" @click="stopEditingInsight" severity="secondary" />
      <i class="fa fa-caret-right" />
      <Button text label="Edit Insight" disabled severity="secondary" />
    </nav>
    <nav class="space-between" v-else>
      <Button text label="Save new insight" disabled severity="secondary" />
      <Button
        icon="fa fa-fw fa-lg fa-times"
        text
        severity="secondary"
        @click="stopEditingInsight"
      />
    </nav>
    <main class="expanded-insight">
      <header>
        <InputText
          v-model="insightTitle"
          :invalid="!insightTitle"
          placeholder="Add a title"
          autofocus
        />
        <div class="right-half">
          <MultiSelect
            :options="questionDropdownItems"
            option-value="id"
            option-label="title"
            display="chip"
            :show-toggle-all="false"
            v-model="assignedQuestionIds"
            placeholder="Assign to one or more questions"
          >
            <template #footer>
              <Button
                class="new-question-button"
                label="Add new question"
                severity="secondary"
                text
                size="small"
                icon="fa fa-fw fa-plus"
                @click="isAddingNewQuestion = true"
              />
            </template>
          </MultiSelect>
          <div class="actions">
            <Button label="Cancel" outlined severity="secondary" @click="stopEditingInsight" />
            <Button
              icon="fa fa-lg fa-fw fa-check"
              label="Done"
              @click="saveInsight"
              :disabled="activeOperation !== null || isInsightTitleInvalid"
            />
          </div>
        </div>
      </header>
      <div class="editable-image" v-if="savedInsightImage !== null">
        <div class="editable-image-controls">
          <Button
            @click="annotateImage"
            label="Annotate"
            icon="fa fa-lg fa-font"
            outlined
            severity="secondary"
            :disabled="activeOperation !== null"
          />
          <Button
            @click="cropImage"
            label="Crop"
            icon="fa fa-lg fa-crop"
            outlined
            severity="secondary"
            :disabled="activeOperation !== null"
          />
          <div class="image-edit-info" v-if="activeOperation === 'annotate'">
            <i class="fa fa-fw fa-info-circle" />Click outside any active text label before saving
            your changes.
          </div>
        </div>
        <div class="slide-image">
          <img :src="savedInsightImage" ref="imageElementRef" />
        </div>
      </div>
      <div v-else class="slide-image"><i class="fa fa-spin fa-spinner" /> Loading image ...</div>
      <div class="details">
        <Textarea placeholder="Add a description" v-model="description" class="description" />
        <InsightSummary
          v-if="metadataDetails !== null"
          :metadata-details="metadataDetails"
          class="insight-summary"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.insight-edit-modal-container {
  display: flex;
  flex-direction: column;
  background: var(--p-surface-0);
}

nav {
  height: 50px;
  display: flex;
  padding: 0 20px;
  align-items: center;
  border-bottom: 1px solid var(--p-surface-200);
  gap: 10px;

  .crumb.clickable {
    cursor: pointer;
    color: var(--p-primary-500);
  }

  &.space-between {
    justify-content: space-between;
  }
}

main {
  flex: 1;
  min-height: 0;
}

.expanded-insight {
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 10px;
}

header {
  display: flex;
  gap: 10px;

  & > * {
    flex: 1;
    min-width: 0;
  }
  .right-half {
    display: flex;
    gap: 10px;

    & > *:not(.actions) {
      flex: 1;
      min-width: 0;
    }
  }

  .actions {
    display: flex;
    gap: 5px;
  }
}

.new-question-button {
  margin-left: 5px;
  margin-bottom: 5px;
}

.editable-image {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .editable-image-controls {
    display: flex;
    gap: 5px;
    padding: 5px 10px;
    background: var(--p-surface-100);
    border-radius: 3px;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border: 1px solid var(--p-surface-200);
    border-bottom-width: 0px;
    align-items: center;
  }

  .image-edit-info {
    justify-content: flex-end;
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 5px;
  }
}

.slide-image {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--p-surface-200);
  border-radius: 3px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  display: grid;
  place-items: center;
  position: relative;
  img {
    --padding: 10px;
    max-width: calc(100% - var(--padding));
    max-height: calc(100% - var(--padding));
    position: absolute;
  }
}

.details {
  border: 1px solid var(--p-surface-200);
  border-radius: 3px;
  background: var(--p-surface-50);
  display: flex;

  & > * {
    flex: 1;
    min-width: 0;
  }

  .description {
    min-height: 100px;
    flex: 1;
    min-width: 0;
    max-width: 90ch;
    margin: 10px;
  }

  .insight-summary {
    border-left: 1px solid var(--p-surface-200);
    padding: 10px;
  }
}
</style>
