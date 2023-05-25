<template>
  <div class="navbar-insights-panel-container">
    <div class="buttons">
      <button type="button" class="btn btn-default" @click="openInsightsExplorer">View all</button>
      <button type="button" class="btn btn-call-to-action expand" @click="saveInsight">
        Save new insight
      </button>
    </div>
    <div v-if="insights.length !== 0" class="insight-list">
      <h4>Insights from this analysis</h4>
      <div
        v-for="insight in insights"
        :key="insight.id"
        class="insight"
        @click="applyInsight(insight)"
      >
        <div class="insight-header">
          <div
            class="insight-title"
            :class="{ 'private-insight-title': insight.visibility === 'private' }"
          >
            {{ insight.name }}
          </div>
          <OptionsButton :dropdown-below="true">
            <template #content>
              <div
                class="dropdown-option"
                :class="{ disabled: isDisabled(insight) }"
                @click="editInsight(insight)"
              >
                <i class="fa fa-edit" />
                Edit
              </div>
              <div
                class="dropdown-option"
                :class="{ disabled: isDisabled(insight) }"
                @click="deleteInsight(insight)"
              >
                <i class="fa fa-trash" />
                Delete
              </div>
            </template>
          </OptionsButton>
        </div>
        <div>
          <ImgLazy :src="`/api/insights/${insight.id}/thumbnail`" class="insight-thumbnail" />
          <div
            v-if="insight.description?.length ?? 0 > 0"
            class="insight-description"
            :class="{ 'private-insight-description': insight.visibility === 'private' }"
          >
            {{ insight.description }}
          </div>
          <span v-else class="insight-empty-description">No description.</span>
        </div>
      </div>
    </div>
    <MessageDisplay v-else :message="INSIGHTS.NO_DATA" />
  </div>
</template>

<script setup lang="ts">
import useInsightsData from '@/services/composables/useInsightsData';
import { ProjectType } from '@/types/Enums';
import { Insight } from '@/types/Insight';
import { unpublishDatacube } from '@/utils/datacube-util';
import insightUtil from '@/utils/insight-util';
import { INSIGHTS } from '@/utils/messages-util';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { countPublicInsights, removeInsight } from '@/services/insight-service';
import MessageDisplay from '../widgets/message-display.vue';
import ImgLazy from '../widgets/img-lazy.vue';
import OptionsButton from '../widgets/options-button.vue';
import useInsightStore from '@/services/composables/useInsightStore';

const emit = defineEmits(['close']);

const store = useStore();
const projectType = computed(() => store.getters['app/projectType']);
const project = computed(() => store.getters['app/project']);
const isDisabled = (insight: Insight) =>
  insight.visibility === 'public' && projectType.value === ProjectType.Analysis;

// The gallery opens over top of this side panel, prevent fetches while the gallery is open
const preventFetches = computed(() => store.getters['insightPanel/isPanelOpen']);
const { insights, reFetchInsights } = useInsightsData(preventFetches, undefined, true);

const {
  showInsightPanel,
  setCurrentPane,
  setSnapshotUrl,
  setUpdatedInsight,
  setInsightsBySection,
  setPositionInReview,
  setRefreshDatacubes,
} = useInsightStore();
const openInsightsExplorer = () => {
  emit('close');
  showInsightPanel();
  setCurrentPane('list-insights');
};
const saveInsight = () => {
  emit('close');
  // Snapshot URL is only used in datacube-card.vue/takeSnapshot.
  setSnapshotUrl(undefined);
  // Open the fullscreen modal used for reviewing new insights.
  showInsightPanel();
  // Updated insight is used to modify an existing insight.
  setUpdatedInsight(null);
  // 'review-new-insight' tells the modal that we're creating a new insight rather than modifying an
  //  existing one.
  setCurrentPane('review-new-insight');
};
const route = useRoute();
const router = useRouter();
const applyInsight = (insight: Insight) => {
  emit('close');
  let savedURL = insight.url;
  const currentURL = route.fullPath;

  // NOTE: applying an insight should not automatically set a specific datacube_id as a query param
  //  because, for example, the comparative analysis (region-ranking) page does not
  //  need/understand a specific datacube_id,
  //  and setting it regardless may have a negative side effect
  const datacubeId =
    savedURL.includes('/dataComparative/') || insight.context_id === undefined
      ? undefined
      : insight.context_id[0];

  if (savedURL !== currentURL) {
    // special case
    if (projectType.value === ProjectType.Analysis && insight.visibility === 'public') {
      // this is an insight created by the domain modeler during model publication:
      // for applying this insight, do not redirect to the domain project page,
      // instead use the current context and rehydrate the view
      savedURL = '/analysis/' + project.value + '/data/' + route.params.analysisId;
    }

    if (projectType.value === ProjectType.Model) {
      // this is an insight created by the domain modeler during model publication:
      //  needed since an existing url may have insight_id with old/invalid value
      savedURL = '/model/' + project.value + '/model-publishing-experiment';
    }

    // add 'insight_id' as a URL param so that the target page can apply it
    const finalURL = insightUtil.getSourceUrlForExport(savedURL, insight.id as string, datacubeId);

    try {
      router.push(finalURL);
    } catch (e) {}
  } else {
    router
      .push({
        query: {
          insight_id: insight.id,
          datacube_id: datacubeId,
        },
      })
      .catch(() => {});
  }
};
const editInsight = (insight: Insight) => {
  showInsightPanel();
  setUpdatedInsight(insight);
  const dummySection = insightUtil.createEmptyChecklistSection();
  const insightsBySection = [
    {
      section: dummySection,
      insights: insights.value,
    },
  ];
  setInsightsBySection(insightsBySection);
  setPositionInReview({
    sectionId: dummySection.id as string,
    insightId: insight.id as string,
  });
  setCurrentPane('review-edit-insight');
};

const deleteInsight = async (insight: Insight) => {
  // are we removing a public insight (from the context panel within a domain project)?
  if (
    insight.visibility === 'public' &&
    Array.isArray(insight.context_id) &&
    insight.context_id.length > 0
  ) {
    // is this the last public insight for the relevant dataube?
    //  if so, unpublish the model datacube
    const datacubeId = insight.context_id[0];
    const publicInsightCount = await countPublicInsights(datacubeId, project.value);
    if (publicInsightCount === 1) {
      await unpublishDatacube(datacubeId);
      setRefreshDatacubes(true);
    }
  }

  const id = insight.id as string;
  await removeInsight(id, store);
  // refresh the latest list from the server
  reFetchInsights();
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/uncharted-design-tokens.scss';
.navbar-insights-panel-container {
  background: white;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
  border-radius: 3px;
  box-shadow: $shadow-level-1;

  &::after {
    // Little caret at the top of the popup
    content: '';
    display: block;
    position: absolute;
    width: 10px;
    height: 10px;
    background: white;
    top: -5px;
    right: 50px;
    transform: rotate(45deg);
  }
}

.insight-list {
  overflow-y: auto;
}

.buttons {
  display: flex;
  gap: 5px;
  .expand {
    flex: 1;
    min-width: 0;
  }
}

.insight {
  cursor: pointer;
  padding: 10px 0;
  .insight-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .insight-title {
      flex: 1 1 auto;
      color: gray;
      font-style: italic;
      font-size: $font-size-large;
    }
    .private-insight-title {
      color: black;
      font-style: normal;
    }
  }
  .insight-thumbnail {
    width: 100%;
  }
  .insight-description {
    color: gray;
    font-style: italic;
  }
  .private-insight-description {
    color: black;
    font-style: normal;
  }
  .insight-empty-description {
    color: black;
    opacity: 0.4;
  }

  &:not(:last-child) {
    border-bottom: 1px solid $un-color-black-10;
  }
}
</style>
