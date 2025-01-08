<script setup lang="ts">
import {
  AnalyticalQuestion,
  FullInsight,
  Insight,
  NewInsight,
  ReviewPosition,
  SectionWithInsights,
} from '@/types/Insight';
import { computed, ref, toRefs, watch } from 'vue';
import InsightPresentationThumbnails from './insight-presentation-thumbnails.vue';
import insightUtil from '@/utils/insight-util';
import { fetchPartialInsights, removeInsight } from '@/services/insight-service';
import Button from 'primevue/button';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import OptionsButton from '../widgets/options-button.vue';
import useInsightStore from '@/composables/useInsightStore';
import useInsightManager from '@/composables/useInsightManager';

const props = defineProps<{
  reviewPosition: ReviewPosition | null;
  questionsList: AnalyticalQuestion[];
  insights: (Insight | NewInsight)[];
}>();
const { reviewPosition, questionsList, insights } = toRefs(props);
const emit = defineEmits<{
  (e: 'set-review-position', position: ReviewPosition | null): void;
  (e: 'remove-insight-from-question', insightId: string, sectionId: string): void;
}>();

const insightsBySection = computed<SectionWithInsights[]>(() =>
  questionsList.value.map(
    (section) =>
      ({
        section,
        insights: section.linked_insights
          .map((insightId) => insights.value.find((insight) => insight.id === insightId))
          .filter((insight) => insight !== undefined),
      } as SectionWithInsights)
  )
);

// When insights by section are loaded, set the review position to the first question
watch(
  insightsBySection,
  (all) => {
    if (all.length === 0 || reviewPosition.value !== null) return;
    // TODO: IDs shouldn't be undefined
    emit('set-review-position', { sectionId: all[0].section.id as string, insightId: null });
  },
  { immediate: true }
);
const selectedSlide = computed<FullInsight | NewInsight | string | null>(() => {
  if (reviewPosition.value === null) return null;
  const { sectionId, insightId } = reviewPosition.value;
  if (reviewPosition.value.insightId === null) {
    return (
      insightsBySection.value.find((section) => section.section.id === sectionId)?.section
        .question ?? null
    );
  }
  return (
    insightsBySection.value
      .find((section) => section.section.id === sectionId)
      ?.insights.find((insight) => insight.id === insightId) ?? null
  );
});
const currentQuestion = computed(
  () =>
    insightsBySection.value.find(
      (section) => section.section.id === reviewPosition.value?.sectionId
    )?.section.question ?? null
);

// TODO: extract to a composable?

const slideImage = ref<string | null>(null);
watch(
  selectedSlide,
  async () => {
    // selectedSlide can be a question, an insight, or null.
    // There is nothing to fetch for a question or null.
    const insight = selectedSlide.value;
    if (
      typeof insight === 'string' ||
      !insightUtil.instanceOfInsight(insight) ||
      insight.id === undefined
    )
      return;

    slideImage.value = null;
    // TODO: check for race conditions
    // TODO: cache the image and annotation state like we do in review insight modal?
    const extras = await fetchPartialInsights({ id: insight.id }, [
      'id',
      'annotation_state',
      'image',
    ]);

    // (updatedInsight.value as FullInsight | NewInsight).image = cache.image;
    // (updatedInsight.value as FullInsight | NewInsight).annotation_state = cache.annotation_state;
    // setAnnotation(cache.annotation_state);
    slideImage.value = extras[0].image;
  },
  { immediate: true }
);
// every time the user navigates to a new insight (or removes the current insight), re-fetch the image
// NOTE: slideImage ideally could be a computed prop, but when in newMode the image is fetched differently
//       plus once slideImage is assigned its watch will apply-annotation insight if any
// watch(updatedInsight, (_updatedInsight) => {
//   slideImage.value = _updatedInsight ? (_updatedInsight as FullInsight | NewInsight).image : null;
// });

const route = useRoute();
const router = useRouter();
const store = useStore();
const jumpToLiveContext = () => {
  // TODO: confirm that this isn't a question or null
  const insight = selectedSlide.value as FullInsight | NewInsight;
  const currentURL = route.fullPath;
  const finalURL = insightUtil.jumpToInsightContext(insight, currentURL);
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
  store.dispatch('insightPanel/hideInsightPanel');
};
const deleteInsight = () => {
  const insightId = reviewPosition.value?.insightId ?? null;
  if (insightId === null) return;
  // remove the insight from the server
  removeInsight(insightId);

  // TODO: remove commented code
  // close editing before deleting insight (this will ensure annotation/crop mode is cleaned up)
  // cancelInsightEdit();
  // remove this insight from each section that contains it in the store
  // TODO: this should happen on the server? is it ever updated on the backend?
  questionsList.value
    .filter((section) => section.linked_insights.includes(insightId))
    .forEach((section) => {
      emit('remove-insight-from-question', insightId, section.id as string);
    });
  emit('set-review-position', null);
};

// TODO: do we need to get this from the store? we have projectMetadata at home
const projectMetadata = computed(() => store.getters['app/projectMetadata']);
const exportInsight = async (exportType: 'Powerpoint' | 'Word') => {
  // const bibliographyMap = await getBibiographyFromCagIds([]);
  // TODO: confirm that this isn't a question or null
  const insight = selectedSlide.value as FullInsight | NewInsight;
  if (exportType === 'Word') {
    insightUtil.exportDOCX([insight], projectMetadata.value, undefined, {});
  } else {
    insightUtil.exportPPTX([insight], projectMetadata.value);
  }
};

const { editInsight } = useInsightManager();
// TODO: remove dependence on store
const { setCurrentPane } = useInsightStore();
const closeInsightReview = () => {
  setCurrentPane('list-insights');
};
</script>

<template>
  <div class="insight-presentation-modal-container">
    <nav>
      <Button text label="All Insights" @click="closeInsightReview" severity="secondary" />
      <i class="fa fa-caret-right" />
      <Button text label="Review Insights" disabled severity="secondary" />
    </nav>
    <div class="row">
      <InsightPresentationThumbnails
        :insights-by-section="insightsBySection"
        :review-position="reviewPosition"
        class="thumbnails"
        @set-review-position="(position) => emit('set-review-position', position)"
      />
      <main v-if="selectedSlide === null" class="center-text">
        <h3 class="subdued">Select an insight</h3>
      </main>
      <main v-else-if="typeof selectedSlide === 'string'" class="center-text">
        <h3>{{ selectedSlide }}</h3>
      </main>
      <main v-else class="expanded-insight">
        <header>
          <div class="title-column">
            <p>{{ currentQuestion ?? '' }}</p>
            <h3>{{ selectedSlide.name }}</h3>
          </div>
          <div class="actions">
            <Button
              icon="fa fa-lg fa-fw fa-arrow-up"
              label="Jump to live context"
              @click="jumpToLiveContext"
            />
            <Button
              icon="fa fa-lg fa-fw fa-pencil"
              label="Edit"
              outlined
              @click="editInsight(selectedSlide.id as string)"
            />
            <OptionsButton :dropdown-below="true">
              <template #content>
                <div class="dropdown-option" @click="exportInsight('Powerpoint')">
                  Download as .PPTX
                </div>
                <div class="dropdown-option" @click="exportInsight('Word')">Download as .DOCX</div>
                <!-- TODO: IDs shouldn't be optional -->
                <div
                  class="dropdown-option"
                  @click="
                    emit(
                      'remove-insight-from-question',
                      reviewPosition?.insightId as string,
                      reviewPosition?.sectionId as string
                    )
                  "
                >
                  Remove from question
                </div>
                <div class="dropdown-option" @click="deleteInsight">Delete</div>
              </template>
            </OptionsButton>
          </div>
        </header>
        <div class="slide-image" v-if="slideImage !== null">
          <img :src="slideImage" />
        </div>
        <div v-else class="slide-image"><i class="fa fa-spin fa-spinner" /> Loading image ...</div>
        <!-- TODO: -->
        <!-- <insight-summary
            v-if="metadataDetails"
            :metadata-details="metadataDetails"
            class="insight-summary"
          /> -->
        <!-- <img :src="selectedSlide.image" /> -->
        <div class="details">
          <p>{{ selectedSlide.description || 'No description.' }}</p>
        </div>
      </main>
    </div>
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

.row {
  display: flex;
  flex: 1;
  min-height: 0;

  main {
    flex: 1;
    min-width: 0;
  }
}

.thumbnails {
  width: 180px;
  border-right: 1px solid var(--p-surface-200);
}

.center-text {
  display: grid;
  place-items: center;
  padding: 20px;
}

.expanded-insight {
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 10px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;

  .title-column {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    p {
      color: var(--subdued);
    }
  }

  .actions {
    display: flex;
    gap: 5px;
  }
}

.slide-image {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--p-surface-200);
  border-radius: 3px;
  display: grid;
  place-items: center;
  position: relative;
  img {
    --padding: 10px;
    width: calc(100% - var(--padding));
    height: calc(100% - var(--padding));
    object-fit: contain;
    position: absolute;
  }
}

.details {
  padding: 10px;
  border: 1px solid var(--p-surface-200);
  border-radius: 3px;
  background: var(--p-surface-50);
}
</style>
