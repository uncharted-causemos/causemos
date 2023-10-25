<template>
  <rename-modal
    v-if="showRenameModal"
    :modal-title="'Rename Analysis'"
    :current-name="selectedAnalysis?.title ?? ''"
    @confirm="onRenameModalConfirm"
    @cancel="showRenameModal = false"
  />
  <duplicate-modal
    v-if="showDuplicateModal"
    :current-name="selectedAnalysis?.title"
    @confirm="onDuplicateConfirm"
    @cancel="showDuplicateModal = false"
  />

  <div class="project-overview-container">
    <header>
      <section class="project-metadata">
        <div class="title">
          <input
            v-if="isEditingTitle"
            v-model="projectMetadata.name"
            type="text"
            class="editable-title"
          />
          <h3 v-else @click="editTitle">
            {{ projectMetadata.name }} <i class="fa fa-fw fa-pencil subdued" />
          </h3>
          <small-icon-button
            v-if="isEditingTitle"
            @click="saveTitle"
            v-tooltip.top-center="'Save changes'"
          >
            <i class="fa fa-check" />
          </small-icon-button>
          <small-icon-button
            v-if="isEditingTitle"
            @click="discardTitle"
            v-tooltip.top-center="'Discard changes'"
          >
            <i class="fa fa-close" />
          </small-icon-button>
        </div>
        <div class="description">
          <textarea
            v-if="isEditingProjectDescription"
            v-model="projectMetadata.description"
            type="text"
            class="editable-description"
          />
          <div
            v-else
            @click="editProjectDescription"
            v-tooltip.top-center="'Edit description'"
            :class="{ 'description-hint-text': !projectMetadata.description }"
          >
            {{ projectMetadata.description ? projectMetadata.description : 'Add a description' }}
            <i class="fa fa-fw fa-pencil" />
          </div>
          <small-icon-button v-if="isEditingProjectDescription">
            <i class="fa fa-check" @click="saveDesc" v-tooltip.top-center="'Save changes'" />
          </small-icon-button>
          <small-icon-button v-if="isEditingProjectDescription">
            <i
              class="fa fa-close"
              @click="discardProjectDescription"
              v-tooltip.top-center="'Discard changes'"
            />
          </small-icon-button>
        </div>
      </section>

      <section class="questions">
        <div class="section-title">
          <h4>Questions</h4>
          <p class="un-font-small subdued">
            Jot down the questions you'll answer with this analysis.
          </p>
        </div>
        <div class="questions-list">
          <analysis-project-overview-question
            v-for="question of questionsList"
            :key="question.id"
            :question="question"
            :is-editing-question="question.id === questionBeingEdited"
            @delete-question="onDeleteQuestion"
            @edit-question="onEditQuestion"
            @save-title="onSaveQuestionTitle"
            @stop-editing-question="questionBeingEdited = null"
          />
          <div v-if="questionsList.length === 0" class="un-font-small subdued">No questions.</div>
        </div>
        <div class="question-buttons">
          <button
            class="btn btn-default"
            @click="onAddQuestion"
            :disabled="questionBeingEdited !== null"
          >
            <i class="fa fa-fw fa-plus" />Add question
          </button>
          <button class="btn btn-default" @click="openInsightsExplorer">
            <i class="fa fa-fw fa-star" />Review insights
          </button>
        </div>
      </section>
    </header>
    <main>
      <div class="section-title">
        <h4>Create insights with the following tools</h4>
        <p class="un-font-small subdued">
          Insights are screenshots of key findings that you can annotate and share.
        </p>
      </div>
      <div class="tool-cards">
        <tool-card-with-analyses
          class="tool-card-column"
          imgSrc="thumbnail-index.png"
          image-opacity="low"
          title="Rank countries"
          subtitle="Choose criteria and see how rankings are projected to change over time."
          call-to-action-title="Create country ranking"
          :analyses="indexAnalyses"
          recent-items-title="Recent country rankings"
          recent-items-type-plural="Country rankings"
          @create="onCreateIndexAnalysis"
          @open="onOpen"
          @delete="onDelete"
          @rename="onRename"
          @duplicate="onDuplicate"
        />
        <tool-card-with-analyses
          class="tool-card-column"
          imgSrc="thumbnail-dataset.png"
          image-opacity="high"
          title="Compare data trends"
          subtitle="Use spatial and temporal trends to generate and confirm hypotheses."
          call-to-action-title="Select a dataset"
          :analyses="datasetAnalyses"
          recent-items-title="Recent collections of datasets"
          recent-items-type-plural="Collections of datasets"
          @create="onCreateDataAnalysis(true)"
          @open="onOpen"
          @delete="onDelete"
          @rename="onRename"
          @duplicate="onDuplicate"
        />
        <tool-card-with-analyses
          class="tool-card-column"
          imgSrc="thumbnail-model.png"
          image-opacity="medium"
          title="Simulate scenarios"
          subtitle="Select different parameter values to compare model simulations and forecasts."
          call-to-action-title="Select a model"
          :analyses="modelAnalyses"
          recent-items-title="Recent collections of models"
          recent-items-type-plural="Collections of models"
          @create="onCreateDataAnalysis(false)"
          @open="onOpen"
          @delete="onDelete"
          @rename="onRename"
          @duplicate="onDuplicate"
        />
        <div class="tool-card-column">
          <tool-card
            @click="goToDocuments"
            imgSrc="thumbnail-documents.png"
            image-opacity="high"
            title="Search documents"
            subtitle="Choose criteria and see how rankings are projected to change over time."
            call-to-action-title="Search documents"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import _ from 'lodash';
import {
  getAnalysesByProjectId,
  deleteAnalysis,
  updateAnalysis,
  duplicateAnalysis,
  createAnalysis,
  createDataAnalysisObject,
  createIndexAnalysisObject,
  getAnalysisState,
} from '@/services/analysis-service';
import dateFormatter from '@/formatters/date-formatter';
import { ProjectType } from '@/types/Enums';
import { ANALYSIS } from '@/utils/messages-util';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import projectService from '@/services/project-service';
import DuplicateModal from '@/components/action-bar/duplicate-modal.vue';
import useQuestionsData from '@/composables/useQuestionsData';
import { computed } from '@vue/reactivity';
import SmallIconButton from '@/components/widgets/small-icon-button.vue';
import { TYPE } from 'vue-toastification';
import { isDataAnalysisState, isIndexAnalysisState } from '@/utils/insight-util';
import useToaster from '@/composables/useToaster';
import { useRouter } from 'vue-router';
import AnalysisProjectOverviewQuestion from '@/components/home/analysis-project-overview-question.vue';
import { Analysis, DataAnalysisState, IndexAnalysisState } from '@/types/Analysis';
import ToolCard from '@/components/home/tool-card.vue';
import { findAllDatasets } from '@/utils/index-tree-util';
import filtersUtil from '@/utils/filters-util';
import { STATUS, TYPE as FILTERS_FIELD_TYPE } from '@/utils/datacube-util';
import ToolCardWithAnalyses from '@/components/home/tool-card-with-analyses.vue';

const router = useRouter();

const toAnalysisObject = (analysis: any): Analysis => {
  const state: IndexAnalysisState | DataAnalysisState = analysis.state;
  const type = isIndexAnalysisState(state) ? 'index' : 'quantitative';
  const item: Analysis = {
    analysisId: analysis.id,
    previewImageSrc: analysis.thumbnail_source || null,
    title: analysis.title,
    subtitle: '',
    description: analysis.description || '',
    type,
    modified_at: analysis.modified_at,
  };
  const modifiedDateString = 'Modified on ' + dateFormatter(analysis.modified_at, 'MMM DD, YYYY');
  if (isIndexAnalysisState(state)) {
    item.nodesWithDatasetsCount = findAllDatasets((state as IndexAnalysisState).index).length;
    item.subtitle =
      `${item.nodesWithDatasetsCount} dataset${item.nodesWithDatasetsCount === 1 ? '' : 's'}` +
      '<br />' +
      modifiedDateString;
  } else if (isDataAnalysisState(state)) {
    const itemIds = state.analysisItems.map(({ id }: { id: string }) => id);
    item.datacubesCount = itemIds.length;
    item.subtitle =
      `${item.datacubesCount} item${item.datacubesCount === 1 ? '' : 's'}` +
      '<br>' +
      modifiedDateString;
  }
  return item;
};

const { questionsList, addSection, updateSectionTitle, deleteSection } = useQuestionsData();
const questionBeingEdited = ref<string | null>(null);
const onAddQuestion = () => {
  addSection(
    '',
    (newQuestionId: string) => {
      questionBeingEdited.value = newQuestionId;
    },
    () => toaster('Unable to add question. Please refresh the page and try again.', TYPE.ERROR)
  );
};
const onEditQuestion = (questionId: string) => {
  questionBeingEdited.value = questionId;
};
const onSaveQuestionTitle = async (questionId: string, newTitle: string) => {
  questionBeingEdited.value = null;
  updateSectionTitle(questionId, newTitle, () =>
    toaster('Unable to update question. Please refresh the page and try again.', TYPE.ERROR)
  );
};
const onDeleteQuestion = (questionId: string) => {
  deleteSection(
    questionId,
    () => {},
    () => toaster('Unable to delete question. Please refresh the page and try again.', TYPE.ERROR)
  );
};

const store = useStore();
const project = computed<string>(() => store.getters['app/project']);
const projectMetadata = computed(() => store.getters['app/projectMetadata']);

const enableOverlay = (message: string) => store.dispatch('app/enableOverlay', message);
const disableOverlay = () => store.dispatch('app/disableOverlay');

const clearContextId = () => store.dispatch('insightPanel/setContextId', []);
onMounted(() => {
  // clear the context to fetch all questions and insights
  clearContextId();
});

const showInsightPanel = () => store.dispatch('insightPanel/showInsightPanel');
const setCurrentPane = (paneId: string) => store.dispatch('insightPanel/setCurrentPane', paneId);

const openInsightsExplorer = () => {
  showInsightPanel();
  setCurrentPane('list-insights');
};

const projectDescription = ref('');
const isEditingProjectDescription = ref(false);
const editProjectDescription = () => {
  projectDescription.value = projectMetadata.value.description;
  isEditingProjectDescription.value = true;
};
const discardProjectDescription = () => {
  projectMetadata.value.description = projectDescription.value;
  isEditingProjectDescription.value = false;
};
const saveDesc = () => {
  // we may have just modified the desc text, so update the server value
  projectService.updateProjectMetadata(project.value, {
    description: projectMetadata.value.description,
  });
  isEditingProjectDescription.value = false;
};

const projectTitle = ref('');
const isEditingTitle = ref(false);
const editTitle = () => {
  projectTitle.value = projectMetadata.value.name;
  isEditingTitle.value = true;
};
const saveTitle = () => {
  projectService.updateProjectMetadata(project.value, {
    name: projectMetadata.value.name,
  });
  isEditingTitle.value = false;
};
const discardTitle = () => {
  projectMetadata.value.name = projectTitle.value;
  isEditingTitle.value = false;
};

const analyses = ref<Analysis[]>([]);
const fetchAnalyses = async () => {
  if (_.isEmpty(projectMetadata.value)) {
    return;
  }
  enableOverlay('Loading analyses...');
  // fetch data space analyses
  const results = (await getAnalysesByProjectId(project.value)).map(toAnalysisObject);
  // Sort by modified_at date with latest on top
  const sortedResults = results.sort((a: any, b: any) => {
    return a.modified_at && b.modified_at ? b.modified_at - a.modified_at : 0;
  });
  analyses.value = sortedResults;
  disableOverlay();
};
watch(projectMetadata, fetchAnalyses, { immediate: true });
const indexAnalyses = computed(() => analyses.value.filter((a) => a.type === 'index'));
const quantitativeAnalyses = computed(() =>
  analyses.value.filter((a) => a.type === 'quantitative')
);

// NOTE: As of October 2023, "quantitative" analyses can contain any combination of models and
//  datasets(indicators), though the interface guides the user to create an analysis of one type
//  or the other. As a temporary measure, we store the type of the first datacube in each analysis
//  to sort the analyses into "collections of datasets" and "collections of models".
const analysisFirstDatacubeIsAnIndicatorMap = ref(new Map<string, boolean>());
const storeIsFirstDatacubeAnIndicator = async (analysisId: string) => {
  const analysisState = await getAnalysisState(analysisId);
  if (analysisState === null) {
    analysisFirstDatacubeIsAnIndicatorMap.value.set(analysisId, false);
    return;
  }
  const isIndicator =
    (analysisState as DataAnalysisState).analysisItems[0].dataConfig.selectedScenarioIds[0] ===
    'indicator';
  analysisFirstDatacubeIsAnIndicatorMap.value.set(analysisId, isIndicator);
};
watch(quantitativeAnalyses, () => {
  // Label each analysis as "contains indicators" or not by fetching and checking the type of the
  //  first datacube. If the analysis has no datacubes, flag it as "doesn't contain indicators".
  quantitativeAnalyses.value.forEach((analysis) => {
    if ((analysis.datacubesCount ?? 0) === 0) {
      analysisFirstDatacubeIsAnIndicatorMap.value.set(analysis.analysisId, false);
      return;
    }
    storeIsFirstDatacubeAnIndicator(analysis.analysisId);
  });
});
const datasetAnalyses = computed(() =>
  analyses.value.filter(
    (a) =>
      a.type === 'quantitative' &&
      analysisFirstDatacubeIsAnIndicatorMap.value.get(a.analysisId) === true
  )
);
const modelAnalyses = computed(() =>
  analyses.value.filter(
    (a) =>
      a.type === 'quantitative' &&
      analysisFirstDatacubeIsAnIndicatorMap.value.get(a.analysisId) === false
  )
);

const showRenameModal = ref(false);
const selectedAnalysis = ref<Analysis | null>(null);
const onRename = (analysis: Analysis) => {
  showRenameModal.value = true;
  selectedAnalysis.value = analysis;
};
const toaster = useToaster();
const onRenameModalConfirm = async (newName: string) => {
  const oldName = selectedAnalysis.value?.title;
  // updating data analysis
  const analysisId = selectedAnalysis.value?.analysisId;
  if (analysisId && oldName !== newName) {
    try {
      await updateAnalysis(analysisId, { title: newName });
      (selectedAnalysis.value as Analysis).title = newName;
      toaster(ANALYSIS.SUCCESSFUL_RENAME, TYPE.SUCCESS, false);
    } catch (e) {
      toaster(ANALYSIS.ERRONEOUS_RENAME, TYPE.INFO, true);
    }
  }
  showRenameModal.value = false;
};

const showDuplicateModal = ref(false);
const onDuplicate = (analysis: Analysis) => {
  selectedAnalysis.value = analysis;
  showDuplicateModal.value = true;
};
const onDuplicateConfirm = async (newName: string) => {
  const analysis = selectedAnalysis.value;

  if (analysis?.analysisId) {
    try {
      const duplicatedAnalysis = await duplicateAnalysis(analysis.analysisId, newName);
      analyses.value.unshift(toAnalysisObject(duplicatedAnalysis));
      toaster(ANALYSIS.SUCCESSFUL_DUPLICATE, TYPE.SUCCESS, false);
    } catch (e) {
      toaster(ANALYSIS.ERRONEOUS_DUPLICATE, TYPE.INFO, true);
    }
  }
  showDuplicateModal.value = false;
};

const onOpen = (analysis: Analysis) => {
  switch (analysis.type) {
    case 'quantitative':
      router.push({
        name: 'dataComparative',
        params: {
          project: project.value,
          projectType: ProjectType.Analysis,
          analysisId: analysis.analysisId,
        },
      });
      break;
    case 'index':
      router.push({
        name: 'indexStructure',
        params: {
          project: project.value,
          projectType: ProjectType.Analysis,
          analysisId: analysis.analysisId,
        },
      });
      break;
    default:
      break;
  }
};
const onCreateIndexAnalysis = async () => {
  const analysis = await createAnalysis(
    `untitled at ${dateFormatter(Date.now())}`,
    '',
    project.value,
    createIndexAnalysisObject()
  );
  router.push({
    name: 'indexStructure',
    params: {
      project: project.value,
      analysisId: analysis.id,
      projectType: ProjectType.Analysis,
    },
  });
};
const onDelete = async (analysis: Analysis) => {
  if (analysis.analysisId) {
    try {
      await deleteAnalysis(analysis.analysisId);
      analyses.value = analyses.value.filter((item) => item.analysisId !== analysis.analysisId);
      toaster(ANALYSIS.SUCCESSFUL_DELETION, TYPE.SUCCESS, false);
    } catch (e) {
      toaster(ANALYSIS.ERRONEOUS_DELETION, TYPE.INFO, true);
    }
  }
};
const onCreateDataAnalysis = async (isIndicatorAnalysis: boolean) => {
  const analysis = await createAnalysis(
    `untitled at ${dateFormatter(Date.now())}`,
    '',
    project.value,
    createDataAnalysisObject()
  );
  const filters = filtersUtil.newFilters();
  filtersUtil.setClause(filters, STATUS, ['READY'], 'or', false);
  const type = isIndicatorAnalysis ? 'indicator' : 'model';
  filtersUtil.setClause(filters, FILTERS_FIELD_TYPE, [type], 'or', false);
  router.push({
    name: 'dataExplorer',
    params: {
      project: project.value,
      analysisId: analysis.id,
      projectType: ProjectType.Analysis,
    },
    query: { analysisId: analysis.id, filters: filters as any },
  });
};
const goToDocuments = () => {
  router.push({
    name: 'documents',
    params: {
      project: project.value,
      projectType: ProjectType.Analysis,
    },
  });
};
</script>

<style lang="scss" scoped>
@import '@/styles/common';
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';

.project-overview-container {
  display: flex;
  flex-direction: column;
  min-height: $content-full-height;
  background: $background-light-1;
}

.description-hint-text {
  font-style: italic;
  color: $label-color;
  cursor: pointer;
}

header {
  overflow: auto;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 40px;

  h3 {
    margin: 0;
    cursor: pointer;

    i {
      font-size: $font-size-small;
    }
  }

  & > *:not(:first-child) {
    margin-top: 5px;
  }

  .description {
    text-align: justify;
    max-width: 90ch;
  }
}

section.project-metadata {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

section.questions {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
}

.section-title {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.questions-list {
  display: flex;
  flex-direction: column;
  padding: 10px 0;
  border-top: 1px solid $un-color-black-10;
  border-bottom: 1px solid $un-color-black-10;
}

.editable-title {
  border-width: 1px;
  border-color: rgb(216, 214, 214);
  font-size: x-large;
}

.editable-description {
  border-width: 1px;
  border-color: rgb(216, 214, 214);
  min-width: 85%;
  flex-basis: 85%;
}

.question-buttons {
  display: flex;
  gap: 10px;
}

main {
  flex: 1;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 30px;
  border-top: 1px solid #f5f1fe;
  background: linear-gradient(180deg, #fcfbff 0%, #ebe5f6 100%);
}

.tool-cards {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.tool-card-column {
  flex: 1;
  min-width: 0;
  max-width: 350px;
  // Make sure dropdown options for the lowest recent item are still visible
  margin-bottom: 140px;
}
</style>
