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
            v-if="isEditingDesc"
            v-model="projectMetadata.description"
            type="text"
            class="editable-description"
          />
          <div
            v-else
            @click="editDesc"
            v-tooltip.top-center="'Edit description'"
            :class="{ 'description-hint-text': !projectMetadata.description }"
          >
            {{ projectMetadata.description ? projectMetadata.description : 'Add a description' }}
            <i class="fa fa-fw fa-pencil" />
          </div>
          <small-icon-button v-if="isEditingDesc">
            <i class="fa fa-check" @click="saveDesc" v-tooltip.top-center="'Save changes'" />
          </small-icon-button>
          <small-icon-button v-if="isEditingDesc">
            <i class="fa fa-close" @click="discardDesc" v-tooltip.top-center="'Discard changes'" />
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
          ></analysis-project-overview-question>
        </div>
        <div class="question-buttons">
          <button class="btn btn-default" @click="onAddQuestion">
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
        <div class="tool-card" @click="onCreateIndexAnalysis">
          <img src="@/assets/thumbnail-index.png" class="thumbnail thumbnail-index" />
          <h5>Rank countries</h5>
          <p class="un-font-small subdued tool-card-description">
            Choose criteria and see how rankings are projected to change over time.
          </p>
          <p class="call-to-action">
            Create country ranking
            <i class="fa fa-fw fa-chevron-right" />
          </p>
        </div>
        <div class="tool-card" @click="onCreateDataAnalysis">
          <img src="@/assets/thumbnail-dataset.png" class="thumbnail thumbnail-dataset" />
          <h5>Compare data trends</h5>
          <p class="un-font-small subdued tool-card-description">
            Use spatial and temporal trends to generate and confirm hypotheses.
          </p>
          <p class="call-to-action">Select a dataset <i class="fa fa-fw fa-chevron-right" /></p>
        </div>
        <div class="tool-card" @click="onCreateDataAnalysis">
          <img src="@/assets/thumbnail-model.png" class="thumbnail thumbnail-model" />
          <h5>Simulate scenarios</h5>
          <p class="un-font-small subdued tool-card-description">
            Select different parameter values to compare model simulations and forecasts.
          </p>
          <p class="call-to-action">Select a model <i class="fa fa-fw fa-chevron-right" /></p>
        </div>
        <div class="tool-card" @click="goToDocuments">
          <img src="@/assets/thumbnail-documents.png" class="thumbnail thumbnail-documents" />
          <h5>Search documents</h5>
          <p class="un-font-small subdued tool-card-description">
            Choose criteria and see how rankings are projected to change over time.
          </p>
          <p class="call-to-action">Search documents <i class="fa fa-fw fa-chevron-right" /></p>
        </div>
      </div>

      <div class="analysis-list-column">
        <div class="analysis-list" v-if="analyses.length > 0">
          <analysis-overview-card
            v-for="(analysis, index) in analyses"
            :key="`${analysis.analysisId}${index}`"
            class="analysis-overview-card"
            :analysis="(analysis as any)"
            @open="onOpen(analysis)"
            @delete="onDelete(analysis)"
            @rename="onRename(analysis)"
            @duplicate="onDuplicate(analysis)"
          />
        </div>
        <div v-if="analyses.length === 0" class="empty-state-container">
          Analyses you create will appear here.
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import AnalysisOverviewCard from '@/components/analysis-overview-card.vue';
import _ from 'lodash';
import {
  getAnalysesByProjectId,
  deleteAnalysis,
  updateAnalysis,
  duplicateAnalysis,
  createAnalysis,
  createDataAnalysisObject,
  createIndexAnalysisObject,
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
import { isIndexAnalysisState } from '@/utils/insight-util';
import useToaster from '@/composables/useToaster';
import { useRouter } from 'vue-router';
import AnalysisProjectOverviewQuestion from '@/components/home/analysis-project-overview-question.vue';

const router = useRouter();

interface Analysis {
  analysisId: string;
  previewImageSrc: string | null;
  title: string;
  subtitle: string;
  description: string;
  type: string;
  modified_at: string;
  analysisItemIds?: string[];
  datacubesCount?: number;
}
const toAnalysisObject = (analysis: any): Analysis => {
  const type = isIndexAnalysisState(analysis.state) ? 'index' : 'quantitative';
  const item: Analysis = {
    analysisId: analysis.id,
    previewImageSrc: analysis.thumbnail_source || null,
    title: analysis.title,
    subtitle: dateFormatter(analysis.modified_at, 'MMM DD, YYYY'),
    description: analysis.description || '',
    type,
    modified_at: analysis.modified_at,
  };
  if (analysis.state?.analysisItems) {
    const itemIds = analysis.state.analysisItems.map(({ id }: { id: string }) => id);
    item.analysisItemIds = itemIds;
    item.datacubesCount = itemIds.length;
  }
  return item;
};

const { questionsList, addSection, updateSectionTitle, deleteSection } = useQuestionsData();
const questionBeingEdited = ref<string | null>(null);
const onAddQuestion = () => {
  addSection(
    '',
    () => {},
    () => toaster('Unable to add question. Please refresh the page and try again.', TYPE.ERROR)
  );
  // TODO: start editing question name: what's its ID?
  // questionBeingEdited.value = questionId;
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

// TODO: rename these
const projectDesc = ref('');
const isEditingDesc = ref(false);
const editDesc = () => {
  projectDesc.value = projectMetadata.value.description;
  isEditingDesc.value = true;
};
const discardDesc = () => {
  projectMetadata.value.description = projectDesc.value;
  isEditingDesc.value = false;
};
const saveDesc = () => {
  // we may have just modified the desc text, so update the server value
  projectService.updateProjectMetadata(project.value, {
    description: projectMetadata.value.description,
  });
  isEditingDesc.value = false;
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
// TODO:
// const quantitativeAnalyses = computed(() =>
//   analyses.value.filter((a) => a.type === 'quantitative')
// );
// const indexAnalyses = computed(() => analyses.value.filter((a) => a.type === 'index'));

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
const onCreateDataAnalysis = async () => {
  const analysis = await createAnalysis(
    `untitled at ${dateFormatter(Date.now())}`,
    '',
    project.value,
    createDataAnalysisObject()
  );
  router.push({
    name: 'dataComparative',
    params: {
      project: project.value,
      analysisId: analysis.id,
      projectType: ProjectType.Analysis,
    },
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
  height: $content-full-height;
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
  min-height: 0;
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
}

.tool-card {
  flex: 1;
  min-width: 0;
  max-width: 500px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: white;
  box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  .thumbnail {
    transition: opacity 0.2s ease;
  }

  .thumbnail-index {
    opacity: 30%;
  }
  .thumbnail-dataset {
    opacity: 50%;
  }
  .thumbnail-model {
    opacity: 40%;
  }
  .thumbnail-documents {
    opacity: 50%;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: $selected;

    .thumbnail {
      opacity: 100%;
    }
  }

  h5 {
    font-weight: bold;
  }

  .thumbnail {
    height: 153px;
  }

  .tool-card-description {
    min-height: 32px;
  }

  .call-to-action {
    color: $accent-main;
  }
}

.insights-column {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.insights {
  background: white;
  padding: 10px;
  // Pane already contains bottom margin
  padding-bottom: 0;
  margin-top: 10px;
  flex: 1;
  min-height: 0;
}

.analysis-list-column {
  flex: 3;
  display: flex;
  flex-direction: column;
  margin-left: 10px;
}

.analysis-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .search-bar {
    padding: 8px;
    width: 250px;
    margin-right: 5px;
    border: 1px solid grey;
  }
}

.analysis-list {
  margin-top: 10px;
  padding-bottom: 20px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.empty-state-container {
  flex: 1;
  min-height: 0;
  position: relative;
  padding: 10px 0;
}

.analysis-overview-card:not(:first-child) {
  margin-top: 5px;
}

.button-container {
  display: flex;
  justify-content: space-between;

  & > *:not(:first-child) {
    margin-left: 5px;
  }
}
</style>
