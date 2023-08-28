<template>
  <rename-modal
    v-if="showRenameModal"
    :modal-title="'Rename Analysis'"
    :current-name="selectedAnalysis.title"
    @confirm="onRenameModalConfirm"
    @cancel="onRenameModalClose"
  />
  <duplicate-modal
    v-if="showDuplicateModal"
    :current-name="selectedAnalysis.title"
    @confirm="onDuplicateConfirm"
    @cancel="showDuplicateModal = false"
  />

  <div class="project-overview-container">
    <header>
      <div class="title">
        <input
          v-if="isEditingTitle"
          v-model="projectMetadata.name"
          type="text"
          class="editable-title"
        />
        <h3 v-else @click="editTitle">{{ projectMetadata.name }}</h3>
        <small-icon-button v-if="isEditingTitle">
          <i class="fa fa-check" @click="saveTitle" v-tooltip.top-center="'Save changes'" />
        </small-icon-button>
        <small-icon-button v-if="isEditingTitle">
          <i class="fa fa-close" @click="discardTitle" v-tooltip.top-center="'Discard changes'" />
        </small-icon-button>
      </div>
      <div class="description">
        <textarea
          v-if="isEditingDesc"
          v-model="projectMetadata.description"
          type="text"
          class="editable-description"
        />
        <div v-else-if="projectMetadata.description">
          {{ projectMetadata.description }}
        </div>
        <div v-else class="description-hint-text">Add a description</div>
        <small-icon-button v-if="isEditingDesc">
          <i class="fa fa-check" @click="saveDesc" v-tooltip.top-center="'Save changes'" />
        </small-icon-button>
        <small-icon-button v-if="isEditingDesc">
          <i class="fa fa-close" @click="discardDesc" v-tooltip.top-center="'Discard changes'" />
        </small-icon-button>
        <small-icon-button v-else>
          <i class="fa fa-edit" @click="editDesc" v-tooltip.top-center="'Edit description'" />
        </small-icon-button>
      </div>
    </header>
    <main>
      <div class="insights-column">
        <button type="button" class="btn btn-call-to-action" @click.stop="openInsightsExplorer">
          <i class="fa fa-fw fa-star fa-lg" />
          Review All Insights
        </button>
        <list-analytical-questions-pane
          :show-checklist-title="true"
          :insights-by-section="insightsBySection"
          @update-section-title="updateSectionTitle"
          @add-section="addSection"
          @delete-section="deleteSection"
          @move-section-above-section="moveSectionAboveSection"
          @remove-insight-from-section="removeInsightFromSection"
          @move-insight="moveInsight"
          class="insights"
        />
      </div>
      <div class="analysis-list-column">
        <div class="analysis-list-header">
          <input v-model="searchText" type="text" placeholder="Search ..." class="search-bar" />
          <dropdown-button
            :items="analysisSortingOptions"
            :selected-item="selectedAnalysisSortingOption"
            :inner-button-label="'Sort by'"
            @item-selected="sortAnalyses"
          />
          <div class="button-container">
            <button type="button" class="btn btn-default" @click="goToDocuments">
              <i class="fa fa-book" />
              Explore documents
            </button>
            <button
              v-tooltip.top-center="'Create a new Quantitative Analysis'"
              type="button"
              class="btn btn-default"
              @click="onCreateDataAnalysis"
            >
              <i class="fa fa-plus" />
              Create quantitative analysis
            </button>
            <button
              v-tooltip.top-center="'Create a new Index'"
              type="button"
              class="btn btn-call-to-action"
              @click="onCreateIndexAnalysis"
            >
              <i class="fa fa-plus" />
              Create index model analysis
            </button>
          </div>
        </div>
        <div class="analysis-list" v-if="filteredAnalyses.length > 0">
          <analysis-overview-card
            v-for="(analysis, index) in filteredAnalyses"
            :key="`${analysis.id}${index}`"
            class="analysis-overview-card"
            :analysis="analysis"
            @open="onOpen(analysis)"
            @delete="onDelete(analysis)"
            @rename="onRename(analysis)"
            @duplicate="onDuplicate(analysis)"
          />
        </div>
        <div v-if="analyses.length === 0" class="empty-state-container">
          <empty-state-instructions class="empty-state-instructions" />
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue';
import { mapGetters, mapActions } from 'vuex';
import AnalysisOverviewCard from '@/components/analysis-overview-card.vue';
import _ from 'lodash';
import {
  getAnalysesByProjectId,
  deleteAnalysis,
  updateAnalysis,
  duplicateAnalysis,
} from '@/services/analysis-service';
import {
  createAnalysis,
  createDataAnalysisObject,
  createIndexAnalysisObject,
} from '@/services/analysis-service-new';
import dateFormatter from '@/formatters/date-formatter';
import { ProjectType } from '@/types/Enums';
import { ANALYSIS } from '@/utils/messages-util';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import projectService from '@/services/project-service';
import ListAnalyticalQuestionsPane from '@/components/analytical-questions/list-analytical-questions-pane.vue';
import DuplicateModal from '@/components/action-bar/duplicate-modal.vue';
import numberFormatter from '@/formatters/number-formatter';
import DropdownButton from '@/components/dropdown-button.vue';
import EmptyStateInstructions from '@/components/empty-state-instructions.vue';
import useQuestionsData from '@/composables/useQuestionsData';
import useInsightsData from '@/composables/useInsightsData';
import { computed } from '@vue/reactivity';
import SmallIconButton from '@/components/widgets/small-icon-button.vue';
import { sortItem, modifiedAtSorter, titleSorter, SortOptions } from '@/utils/sort/sort-items';
import { TYPE } from 'vue-toastification';
import { isIndexAnalysisState } from '@/utils/insight-util';

const toAnalysisObject = (analysis) => {
  const type = isIndexAnalysisState(analysis.state) ? 'index' : 'quantitative';
  const item = {
    analysisId: analysis.id,
    previewImageSrc: analysis.thumbnail_source || null,
    title: analysis.title,
    subtitle: dateFormatter(analysis.modified_at, 'MMM DD, YYYY'),
    description: analysis.description || '',
    type,
    modified_at: analysis.modified_at,
  };
  if (analysis.state?.analysisItems) {
    item.analysisItemIds = analysis.state.analysisItems.map((dc) => dc.id);
    item.datacubesCount = item.analysisItemIds.length;
  }
  return item;
};

export default defineComponent({
  name: 'AnalysisProjectOverview',
  components: {
    AnalysisOverviewCard,
    ListAnalyticalQuestionsPane,
    RenameModal,
    DuplicateModal,
    DropdownButton,
    EmptyStateInstructions,
    SmallIconButton,
  },
  setup() {
    const { insights } = useInsightsData(undefined, [
      'id',
      'name',
      'visibility',
      'analytical_question',
    ]);

    const {
      questionsList,
      addSection,
      updateSectionTitle,
      deleteSection,
      moveSectionAboveSection,
      removeInsightFromSection,
      moveInsight,
    } = useQuestionsData();

    const insightsBySection = computed(() => {
      return questionsList.value.map((section) => {
        // FIXME: optimize by using maps
        const _insights = section.linked_insights
          .map((insightId) => insights.value.find((insight) => insight.id === insightId))
          .filter((insight) => insight !== undefined);
        return {
          section,
          // FIXME: these might need to be FullInsights when we support jumping
          //  straight to review from this page.
          insights: _insights,
        };
      });
    });

    const showDuplicateModal = ref(false);
    return {
      insightsBySection,
      addSection,
      updateSectionTitle,
      deleteSection,
      moveSectionAboveSection,
      removeInsightFromSection,
      moveInsight,
      showDuplicateModal,
    };
  },
  data: () => ({
    analyses: [],
    quantitativeAnalyses: [],
    indexAnalyses: [],
    searchText: '',
    showSortingDropdownAnalyses: false,
    analysisSortingOptions: Object.values(SortOptions),
    selectedAnalysisSortingOption: SortOptions.MostRecent,
    isEditingTitle: false,
    isEditingDesc: false,
    showDocumentModal: false,
    showRenameModal: false,
    selectedAnalysis: null,
    projectDesc: '',
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      projectMetadata: 'app/projectMetadata',
    }),
    filteredAnalyses() {
      return this.analyses.filter((analysis) => {
        return analysis.title.toLowerCase().includes(this.searchText.toLowerCase());
      });
    },
  },
  watch: {
    projectMetadata: function () {
      this.fetchAnalyses();
    },
  },
  async mounted() {
    this.fetchAnalyses();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      setContextId: 'insightPanel/setContextId',
      showInsightPanel: 'insightPanel/showInsightPanel',
      setCurrentPane: 'insightPanel/setCurrentPane',
    }),
    numberFormatter,
    openInsightsExplorer() {
      this.showInsightPanel();
      this.setCurrentPane('list-insights');
    },
    editDesc() {
      this.projectDesc = this.projectMetadata.description;
      this.isEditingDesc = true;
    },
    discardDesc() {
      this.projectMetadata.description = this.projectDesc;
      this.isEditingDesc = false;
    },
    saveDesc() {
      // we may have just modified the desc text, so update the server value
      projectService.updateProjectMetadata(this.project, {
        description: this.projectMetadata.description,
      });
      this.isEditingDesc = false;
    },
    editTitle() {
      this.projectTitle = this.projectMetadata.name;
      this.isEditingTitle = true;
    },
    saveTitle() {
      projectService.updateProjectMetadata(this.project, {
        name: this.projectMetadata.name,
      });
      this.isEditingTitle = false;
    },
    discardTitle() {
      this.projectMetadata.name = this.projectTitle;
      this.isEditingTitle = false;
    },
    async fetchAnalyses() {
      if (_.isEmpty(this.projectMetadata)) {
        return;
      }

      this.enableOverlay('Loading analyses...');

      // context-id should be an array to fetch insights for each and every datacube/cag in all project analyses
      const contextIDs = [];

      // fetch data space analyses
      const analyses = (await getAnalysesByProjectId(this.project)).map(toAnalysisObject);

      this.indexAnalyses = analyses.filter((a) => a.type === 'index');

      this.quantitativeAnalyses = analyses.filter((a) => a.type === 'quantitative');

      // save context-id(s) for all data-analyses
      this.quantitativeAnalyses.forEach((analysis) => {
        contextIDs.push(...(analysis.analysisItemsIds || []));
      });

      this.analyses = [...this.indexAnalyses, ...this.quantitativeAnalyses];

      // FIXME: setContextId would fetch insights/questions for all datacubes and CAGs in all analyses
      //
      // @UPDATE: not needed currently in this context since we do not display the insight count and the insight panel is not shown
      //  with regards to questions, also, there is no need to fetch for all contexts as it is enough to fetch public and project-level questions
      // this.setContextId(contextIDs);
      //
      // clear the context to fetch all questions, and insights if applicable
      this.setContextId([]);

      // Sort by modified_at date with latest on top
      this.sortAnalysesByMostRecentDate();

      this.disableOverlay();
    },
    onRename(analysis) {
      this.showRenameModal = true;
      this.selectedAnalysis = analysis;
    },
    async onRenameModalConfirm(newName) {
      const oldName = this.selectedAnalysis && this.selectedAnalysis.title;

      // updating data analysis
      const analysisId = this.selectedAnalysis && this.selectedAnalysis.analysisId;
      if (analysisId && oldName !== newName) {
        try {
          await updateAnalysis(analysisId, { title: newName });
          this.selectedAnalysis.title = newName;
          this.toaster(ANALYSIS.SUCCESSFUL_RENAME, TYPE.SUCCESS, false);
        } catch (e) {
          this.toaster(ANALYSIS.ERRONEOUS_RENAME, TYPE.INFO, true);
        }
      }

      this.onRenameModalClose();
    },
    onRenameModalClose() {
      this.showRenameModal = false;
    },
    onDuplicate(analysis) {
      this.selectedAnalysis = analysis;
      this.showDuplicateModal = true;
    },
    async onDuplicateConfirm(newName) {
      const analysis = this.selectedAnalysis;

      if (analysis.analysisId) {
        try {
          const duplicatedAnalysis = await duplicateAnalysis(analysis.analysisId, newName);
          this.analyses.unshift(toAnalysisObject(duplicatedAnalysis));
          this.toaster(ANALYSIS.SUCCESSFUL_DUPLICATE, TYPE.SUCCESS, false);
        } catch (e) {
          this.toaster(ANALYSIS.ERRONEOUS_DUPLICATE, TYPE.INFO, true);
        }
      }
      this.showDuplicateModal = false;
    },
    async onDelete(analysis) {
      if (analysis.analysisId) {
        try {
          await deleteAnalysis(analysis.analysisId);
          this.analyses = this.analyses.filter((item) => item.analysisId !== analysis.analysisId);
          this.toaster(ANALYSIS.SUCCESSFUL_DELETION, TYPE.SUCCESS, false);
        } catch (e) {
          this.toaster(ANALYSIS.ERRONEOUS_DELETION, TYPE.INFO, true);
        }
      }
    },
    onOpen(analysis) {
      const params = {
        project: this.project,
        projectType: ProjectType.Analysis,
      };
      let name = '';
      switch (analysis.type) {
        case 'quantitative':
          params.analysisId = analysis.analysisId;
          name = 'dataComparative';
          break;
        case 'index':
          params.analysisId = analysis.analysisId;
          name = 'indexStructure';
          break;
        default:
          break;
      }
      this.$router.push({
        name,
        params,
      });
    },
    async onCreateIndexAnalysis() {
      const analysis = await createAnalysis(
        `untitled at ${dateFormatter(Date.now())}`,
        '',
        this.project,
        createIndexAnalysisObject()
      );
      this.$router.push({
        name: 'indexStructure',
        params: {
          project: this.project,
          analysisId: analysis.id,
          projectType: ProjectType.Analysis,
        },
      });
    },
    async onCreateDataAnalysis() {
      const analysis = await createAnalysis(
        `untitled at ${dateFormatter(Date.now())}`,
        '',
        this.project,
        createDataAnalysisObject()
      );
      this.$router.push({
        name: 'dataComparative',
        params: {
          project: this.project,
          analysisId: analysis.id,
          projectType: ProjectType.Analysis,
        },
      });
    },
    goToDocuments() {
      this.$router.push({
        name: 'documents',
        params: {
          project: this.project,
          projectType: ProjectType.Analysis,
        },
      });
    },
    toggleSortingDropdownAnalyses() {
      this.showSortingDropdownAnalyses = !this.showSortingDropdownAnalyses;
    },
    sortAnalysesByMostRecentDate() {
      this.analyses.sort((a, b) => {
        return a.modified_at && b.modified_at ? b.modified_at - a.modified_at : 0;
      });
    },
    sortAnalyses(option) {
      this.selectedAnalysisSortingOption = option;
      this.showSortingDropdownAnalyses = false;
      this.analyses = sortItem(
        this.analyses,
        { date: modifiedAtSorter, name: titleSorter },
        this.selectedAnalysisSortingOption
      );
    },
  },
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.project-overview-container {
  display: flex;
  flex-direction: column;
  height: $content-full-height;
}

.description-hint-text {
  font-style: italic;
  color: $label-color;
}

header {
  overflow: auto;
  padding: 20px;
  padding-bottom: 0;
  height: 25vh;

  h3 {
    margin: 0;
  }

  & > *:not(:first-child) {
    margin-top: 5px;
  }

  .description {
    text-align: justify;
    max-width: 90ch;
  }
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

main {
  flex: 1;
  min-height: 0;
  padding: 20px;
  display: flex;
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
}

.empty-state-instructions {
  width: 100%;
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
