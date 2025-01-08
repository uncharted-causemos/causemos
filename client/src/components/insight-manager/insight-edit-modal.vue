<script setup lang="ts">
import useInsightAnnotation from '@/composables/useInsightAnnotation';
import useInsightStore from '@/composables/useInsightStore';
import useToaster from '@/composables/useToaster';
import { fetchFullInsights, updateInsight } from '@/services/insight-service';
import { updateQuestion } from '@/services/question-service';
import { AnalyticalQuestion, FullInsight, NewInsight } from '@/types/Insight';
import { INSIGHTS } from '@/utils/messages-util';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Textarea from 'primevue/textarea';
import { computed, ref, toRefs, watch } from 'vue';
import { TYPE } from 'vue-toastification';

const props = defineProps<{
  insightId: string | null;
  questionsList: AnalyticalQuestion[];
}>();
const { insightId, questionsList } = toRefs(props);
const emit = defineEmits<{
  (e: 'cancel-editing-insight'): void;
  (e: 'refresh-questions-and-insights'): void;
}>();

const isCreatingInsight = computed(() => insightId.value === null);

const questionDropdownItems = computed(() => [
  ...questionsList.value.map((q) => ({ id: q.id as string, title: q.question })),
]);
const assignedQuestionIds = ref<string[]>([]);
watch(
  questionsList,
  (questions) => {
    assignedQuestionIds.value = questions
      .filter((question) => question.linked_insights.includes(insightId.value as string))
      .map((q) => q.id as string);
  },
  { immediate: true }
);
const savedInsightState = ref<FullInsight | NewInsight | null>(null);
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

const slideImage = computed(() => savedInsightState.value?.image ?? null);
watch(
  insightId,
  async (id) => {
    // TODO: if insight Id is null, we're creating a new insight, so we should fetch the image differently
    if (id === null) {
      return;
    }
    // TODO: check for race conditions
    savedInsightState.value = (await fetchFullInsights({ id }, true))[0];
  },
  { immediate: true }
);
// every time the user navigates to a new insight (or removes the current insight), re-fetch the image
// NOTE: slideImage ideally could be a computed prop, but when in newMode the image is fetched differently
//       plus once slideImage is assigned its watch will apply-annotation insight if any
// watch(updatedInsight, (_updatedInsight) => {
//   slideImage.value = _updatedInsight ? (_updatedInsight as FullInsight | NewInsight).image : null;
// });

const {
  imageElementRef,
  //   onCancelEdit,
  cropImage,
  annotateImage,
  //   showCropInfoMessage,
  //   annotationAndCropState,
  //   insightThumbnail,
  //   setAnnotation,
  insightThumbnail,
} = useInsightAnnotation(savedInsightState);

// TODO: remove dependence on store
const { setCurrentPane } = useInsightStore();
const closeInsightReview = () => {
  setCurrentPane('list-insights');
};
const stopEditingInsight = () => {
  emit('cancel-editing-insight');
};

// TODO: highlight input when invalid
const isInsightTitleInvalid = computed(() => insightTitle.value.trim().length === 0);
const toaster = useToaster();
const saveInsight = async () => {
  const id = insightId.value;
  if (id === null || isInsightTitleInvalid.value || savedInsightState.value === undefined) return;

  const currentlyAssignedQuestions = questionsList.value.filter((q) =>
    q.linked_insights.includes(id)
  );
  const updatedAssignedQuestions = questionsList.value.filter((q) =>
    assignedQuestionIds.value.includes(q.id as string)
  );
  const newAssignedQuestions = updatedAssignedQuestions.filter(
    (q) => !currentlyAssignedQuestions.includes(q)
  );
  const removedAssignedQuestions = currentlyAssignedQuestions.filter(
    (q) => !updatedAssignedQuestions.includes(q)
  );

  // TODO: new insights
  // if (isNewModeActive.value) {
  //   // saving a new insight
  //   const url = route.fullPath;

  //   let newInsight: FullInsight | ModelOrDatasetStateInsight = {
  //     name: insightTitle.value,
  //     description: insightDesc.value,
  //     project_id: project.value,
  //     context_id: contextId.value,
  //     url,
  //     is_default: true,
  //     image: insightThumbnail.value ?? '',
  //     annotation_state: annotationAndCropState.value,
  //     view_state: viewState.value,
  //     data_state: dataState.value,
  //   };

  //   // FIXME: HACK: determine whether we should use the new insight schema depending on the route
  //   //  name that the new insight was taken from
  //   if (['modelDrilldown', 'datasetDrilldown'].includes(route.name as string)) {
  //     const newModelOrDatasetStateInsight: ModelOrDatasetStateInsight = {
  //       schemaVersion: 2,
  //       id: uuidv4(),
  //       name: insightTitle.value,
  //       description: insightDesc.value,
  //       project_id: project.value,
  //       image: insightThumbnail.value ?? '',
  //       annotation_state: annotationAndCropState.value,
  //       type: 'ModelOrDatasetStateInsight',
  //       // ASSUMPTION: view is not null
  //       view: getModelOrDatasetStateViewFromRoute(route) as ModelOrDatasetStateView,
  //       context_id: contextId.value,
  //       // ASSUMPTION: state has been set before the new insight flow began, so modelOrDatasetState
  //       //  is not null
  //       state: modelOrDatasetState.value as ModelOrDatasetState,
  //     };
  //     newInsight = newModelOrDatasetStateInsight;
  //   }

  //   addInsight(newInsight)
  //     .then((result) => {
  //       const message =
  //         result.status === 200 ? INSIGHTS.SUCCESSFUL_ADDITION : INSIGHTS.ERRONEOUS_ADDITION;
  //       if (message === INSIGHTS.SUCCESSFUL_ADDITION) {
  //         toaster(message, TYPE.SUCCESS, false);

  //         // after the insight is created and have a valid id, we need to link that to the question
  //         if (linkedQuestions) {
  //           const insightId = result.data.id;
  //           linkedQuestions.forEach((section) => {
  //             addInsightToSection(insightId, section.id as string);
  //           });
  //         }
  //       } else {
  //         toaster(message, TYPE.INFO, true);
  //       }
  //       closeInsightReview();
  //       setShouldRefetchInsights(true);
  //     })
  //     .catch(() => {
  //       // just in case the call to the server fails
  //       closeInsightReview();
  //     });
  // } else {
  // saving an existing insight

  const updatedInsight = { ...(savedInsightState.value as FullInsight | NewInsight) };
  updatedInsight.name = insightTitle.value;
  updatedInsight.description = description.value;
  updatedInsight.image = insightThumbnail.value ?? '';
  // TODO: annotation and crop state
  // updatedInsight.annotation_state = annotationAndCropState.value;
  const result = await updateInsight(id, updatedInsight);
  if (result.updated !== 'success') {
    toaster(INSIGHTS.ERRONEOUS_UPDATE, TYPE.INFO, true);
    return;
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
  toaster(INSIGHTS.SUCCESSFUL_UPDATE, TYPE.SUCCESS, false);
  stopEditingInsight();
};
// }
</script>

<template>
  <div class="insight-presentation-modal-container">
    <nav v-if="!isCreatingInsight">
      <Button text label="All Insights" @click="closeInsightReview" severity="secondary" />
      <i class="fa fa-caret-right" />
      <Button text label="Review Insights" @click="stopEditingInsight" severity="secondary" />
      <i class="fa fa-caret-right" />
      <Button text label="Edit Insight" disabled severity="secondary" />
    </nav>
    <nav class="space-between" v-else>
      <Button text label="Edit Insight" disabled severity="secondary" />
      <Button icon="fa fa-fw fa-times" />
    </nav>
    <main class="expanded-insight">
      <header>
        <InputText v-model="insightTitle" />
        <div class="right-half">
          <MultiSelect
            :options="questionDropdownItems"
            option-value="id"
            option-label="title"
            multiple="true"
            v-model="assignedQuestionIds"
            placeholder="Assign to one or more questions"
          />
          <div class="actions">
            <Button label="Cancel" outlined severity="secondary" @click="stopEditingInsight" />
            <Button icon="fa fa-lg fa-fw fa-check" label="Done" @click="saveInsight" />
          </div>
        </div>
      </header>
      <div class="editable-image" v-if="slideImage !== null">
        <div class="editable-image-controls">
          <!-- TODO: icons -->
          <Button
            @click="annotateImage"
            label="Annotate"
            icon="fa fa-lg fa-font"
            outlined
            severity="secondary"
          />
          <Button
            @click="cropImage"
            label="Crop"
            icon="fa fa-lg fa-crop"
            outlined
            severity="secondary"
          />
        </div>
        <div class="slide-image">
          <!-- TODO: rename slideImage to savedInsightImage -->
          <img :src="slideImage" ref="imageElementRef" />
        </div>
      </div>
      <div v-else class="slide-image"><i class="fa fa-spin fa-spinner" /> Loading image ...</div>
      <div class="details">
        <Textarea placeholder="Add a description" v-model="description" class="description" />
        <!-- TODO: -->
        <!-- <insight-summary
              v-if="metadataDetails"
              :metadata-details="metadataDetails"
              class="insight-summary"
            /> -->
        <!-- <img :src="selectedSlide.image" /> -->
      </div>
    </main>
  </div>
</template>

<style scoped>
.insight-presentation-modal-container {
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

.editable-image {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .editable-image-controls {
    display: flex;
    gap: 5px;
    padding: 5px;
    background: var(--p-surface-100);
    border-radius: 3px;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border: 1px solid var(--p-surface-200);
    border-bottom-width: 0px;
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
  padding: 10px;
  border: 1px solid var(--p-surface-200);
  border-radius: 3px;
  background: var(--p-surface-50);
  display: flex;
}

.description {
  min-height: 100px;
  flex: 1;
  min-width: 0;
  max-width: 90ch;
}
</style>
