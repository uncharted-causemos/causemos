<template>
  <rename-modal
    v-if="showRenameModal"
    :modal-title="'Rename Analysis'"
    :current-name="selectedAnalysisToRename.title"
    @confirm="onRenameModalConfirm"
    @cancel="onRenameModalClose"
  />
  <div class="project-overview-container">
    <div class="row row-header" style="height: 20vh; margin-bottom: 1rem">
      <div class="col-md-8">
        <h3>
          {{projectMetadata.name}}
          <span
            class="edit-model-desc"
            @click="updateDesc"
            v-tooltip.top-center="'Edit description'"
          >
            <i class="fa fa-edit" />
          </span>
        </h3>
        <!-- datacube desc -->
        <div v-if="!isEditingDesc">
          {{projectMetadata.description}}
        </div>
        <div v-else style="display: flex;">
          <textarea
            v-model="projectDesc"
            type="text"
            class="model-attribute-desc"
          />
          <button
            class="btn btn-primary button-spacing btn-call-for-action"
            @click="updateDesc">
              Save
          </button>
          <button
            class="btn btn-default button-spacing"
            @click="isEditingDesc=!isEditingDesc">
              Cancel
          </button>
        </div>
        <div style="padding-top: 5px; ">
          <b>Contributors: </b>
          <span v-for="analyst in ['Analyst 1', 'Analyst 2']"
          :key="analyst" class="maintainer">{{analyst}}</span>
        </div>
        <div class="tags-container">
          <b style="flex-basis: 100%">Tags:</b>
          <div
            v-for="tag in tags"
            :key="tag"
            class="tag">
            {{ tag }}
          </div>
        </div>
      </div>
      <div class="col-md-2 KBstats-container">
        <b style="flex-basis: 100%">KNOWLEDGE BASE:</b>
        <div>{{ KBname }}</div>
        <br>
        <div><b>{{ numberFormatter(numDocuments) }}</b> documents</div>
        <div><b>{{ numberFormatter(numStatements) }}</b> causal relationships</div>
        <div>
          <button
            class="button"
            style="margin-top: 5px"
            @click="showDocumentModal=true">
              Add Documents
          </button>
        </div>
        <modal-upload-document
          v-if="showDocumentModal === true"
          @close="showDocumentModal = false" />
      </div>
      <div class="col-md-2" style="height: 100%; padding-left: 0px; padding-right: 0px">
        <img
                class="map-image"
                src="../assets/GenericWorld.png"
                alt="Generic world map"
          >
        <!-- placeholder for area-of-interest image -->
      </div>
    </div>
    <hr />
    <div class="col-md-12">
      <div class="col-md-3 insight-container">
        <button
          type="button"
          class="btn btn-primary btn-call-for-action button-spacing"
          @click.stop="openInsightsExplorer">
            <i class="fa fa-fw fa-star fa-lg" />
            Review Analysis Checklist
        </button>
        <list-analytical-questions-pane />
      </div>
      <div class="col-md-9">
        <div class="row">
          <div style="justify-content: space-between; display: flex">
            <div class="controls">
              <input
                v-model="searchText"
                type="text"
                placeholder="Search ..."
                class="form-control"
              >
              <div class="sorting">
               <button
                  type="button"
                  class="btn btn-default"
                  @click="toggleSortingDropdownAnalyses"
                ><span class="lbl">Sort by</span> - {{ selectedAnalysisSortingOption }}
                  <i class="fa fa-caret-down" />
                </button>
                <div v-if="showSortingDropdownAnalyses">
                  <dropdown-control class="dropdown">
                    <template #content>
                      <div
                        v-for="option in analysisSortingOptions"
                        :key="option"
                        class="dropdown-option"
                        @click="sortAnalyses(option)">
                        {{ option }}
                      </div>
                    </template>
                  </dropdown-control>
                </div>
              </div>
            </div>
            <div class="button-container">
              <button
                v-tooltip.top-center="'Create a new Qualitative Model'"
                type="button"
                class="btn btn-primary button-spacing btn-call-for-action"
                @click="onCreateCAG"
                ><i class="fa fa-plus-circle" />
                  Qualitative Model
              </button>
              <button
                v-tooltip.top-center="'Create a new Quantitative Analysis'"
                type="button"
                class="btn btn-primary button-spacing btn-call-for-action"
                @click="onCreateDataAnalysis"
                ><i class="fa fa-plus-circle" />
                  Quantitative Analysis
              </button>
            </div>
          </div>
        </div>
        <div class="row analyses-list-elements">
          <div
            v-for="analysis in filteredAnalyses"
            :key="analysis.id">
            <analysis-overview-card
              :analysis="analysis"
              @open="onOpen(analysis)"
              @delete="onDelete(analysis)"
              @rename="onRename(analysis)"
              @duplicate="onDuplicate(analysis)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import AnalysisOverviewCard from '@/components/analysis-overview-card.vue';
import _ from 'lodash';
import DropdownControl from '@/components/dropdown-control.vue';
import { getAnalysisState, getAnalysesByProjectId, createAnalysis, deleteAnalysis, updateAnalysis, duplicateAnalysis } from '@/services/analysis-service';
import dateFormatter from '@/formatters/date-formatter';
import modelService from '@/services/model-service';
import ModalUploadDocument from '@/components/modals/modal-upload-document';
import { ProjectType } from '@/types/Enums';
import { ANALYSIS, CAG } from '@/utils/messages-util';
import RenameModal from '@/components/action-bar/rename-modal';
import projectService from '@/services/project-service';
import ListAnalyticalQuestionsPane from '@/components/analytical-questions/list-analytical-questions-pane.vue';
import numberFormatter from '@/formatters/number-formatter';

const toQuantitative = analysis => ({
  analysisId: analysis.id,
  previewImageSrc: analysis.thumbnail_source || null,
  title: analysis.title,
  subtitle: dateFormatter(analysis.modified_at, 'MMM DD, YYYY'),
  description: analysis.description || '',
  type: 'quantitative',
  modified_at: analysis.modified_at
});

const toQualitative = cag => ({
  id: cag.id,
  previewImageSrc: cag.thumbnail_source ?? null,
  title: cag.name,
  subtitle: dateFormatter(cag.modified_at, 'MMM DD, YYYY'),
  description: cag.description || '',
  type: 'qualitative',
  modified_at: cag.modified_at
});

export default {
  name: 'AnalysisProjectOverview',
  components: {
    AnalysisOverviewCard,
    ListAnalyticalQuestionsPane,
    DropdownControl,
    ModalUploadDocument,
    RenameModal
  },
  data: () => ({
    analyses: [],
    qualitativeAnalyses: [],
    quantitativeAnalyses: [],
    numDocuments: '-',
    numStatements: '-',
    KBname: '-',
    searchText: '',
    showSortingDropdownAnalyses: false,
    analysisSortingOptions: ['Most recent', 'Earliest'],
    selectedAnalysisSortingOption: 'Most recent',
    isEditingDesc: false,
    showDocumentModal: false,
    showRenameModal: false,
    selectedAnalysisToRename: null,
    projectDesc: ''
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      projectMetadata: 'app/projectMetadata'
    }),
    filteredAnalyses() {
      return this.analyses.filter(analysis => {
        return analysis.title.toLowerCase().includes(this.searchText.toLowerCase());
      });
    },
    tags() {
      return []; // FIXME
    }
  },
  watch: {
    projectMetadata: function() {
      this.fetchAnalyses();
    }
  },
  async mounted() {
    this.fetchAnalyses();
    this.fetchKbStats();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      updateAnalysisItems: 'dataAnalysis/updateAnalysisItems',
      setContextId: 'insightPanel/setContextId',
      showInsightPanel: 'insightPanel/showInsightPanel',
      setCurrentPane: 'insightPanel/setCurrentPane'
    }),
    numberFormatter,
    openInsightsExplorer() {
      this.showInsightPanel();
      this.setCurrentPane('list-insights');
    },
    updateDesc() {
      if (this.isEditingDesc) {
        this.projectMetadata.description = this.projectDesc;
        // we may have just modified the desc text, so update the server value
        projectService.updateProjectMetadata(this.project, { description: this.projectMetadata.description });
      } else {
        // make sure that local description value is up to date
        this.projectDesc = this.projectMetadata.description;
      }
      this.isEditingDesc = !this.isEditingDesc;
    },
    async fetchAnalyses() {
      if (_.isEmpty(this.projectMetadata)) {
        return;
      }

      this.enableOverlay('Loading analyses...');

      // context-id should be an array to fetch insights for each and every datacube/cag in all project analyses
      const contextIDs = [];

      // fetch data space analyses
      this.quantitativeAnalyses = (await getAnalysesByProjectId(this.project)).map(toQuantitative);

      if (this.quantitativeAnalyses.length) {
        // save context-id(s) for all data-analyses
        const promises = this.quantitativeAnalyses.map((analysis) => {
          return getAnalysisState(analysis.analysisId);
        });
        const allRawResponses = await Promise.all(promises);
        // @REVIEW
        // the assumption here is that each response in the allRawResponses refers to a specific quantitativeAnalyses
        // so we could utilize that to update the stats count
        allRawResponses.forEach((analysesState, indx) => {
          if (analysesState.analysisItems !== undefined) {
            const analysisContextIDs = analysesState.analysisItems.map(dc => dc.id);
            contextIDs.push(...analysisContextIDs);
            // save the datacube count
            this.quantitativeAnalyses[indx].datacubesCount = analysisContextIDs.length;
          } else {
            // save the datacube count
            this.quantitativeAnalyses[indx].datacubesCount = 0;
          }
        });
      }

      // knowledge and model space analyses
      this.qualitativeAnalyses = (await modelService.getProjectModels(this.project)).models.map(toQualitative);

      if (this.qualitativeAnalyses.length) {
        const modelIDs = this.qualitativeAnalyses.map(model => model.id);
        const stats = await modelService.getModelStats(modelIDs);

        this.qualitativeAnalyses.forEach(analysis => { // merge edge and node counts into analysis objects
          analysis.nodeCount = _.get(stats[analysis.id], 'nodeCount', 0);
          analysis.edgeCount = _.get(stats[analysis.id], 'edgeCount', 0);
        });

        // save context-id(s) for all CAG-analyses
        this.qualitativeAnalyses.forEach(qualitativeAnalysis => {
          contextIDs.push(qualitativeAnalysis.id);
        });
      }

      this.analyses = [...this.quantitativeAnalyses, ...this.qualitativeAnalyses];

      // FIXME: this will fetch insights/questions for all datacubes and CAGs in all project analyses
      //
      // @UPDATE: not needed currently in this context since we do not display the insight count and the insight panel is not shown
      //  with regards to questions, also, there is no need to fetch for all contexts as it is enough to fetch public and project-level questions
      // this.setContextId(contextIDs);
      //  clear the context which may have been set by opening one of the existing analyses
      this.setContextId([]);

      // Sort by modified_at date with latest on top
      this.sortAnalysesByMostRecentDate();

      this.disableOverlay();
    },
    async fetchKbStats() {
      const KBlist = await projectService.getKBs(); // FIXME this is more expensive than it needs to be, we fetch the whole list of KBs then only use one
      const projectKB_id = this.projectMetadata.kb_id;
      const projectKB = KBlist.find(kb => kb.id === projectKB_id);

      this.numDocuments = _.get(projectKB.corpus_parameter, 'num_documents', 0);
      this.numStatements = _.get(projectKB.corpus_parameter, 'num_statements', 0);
      this.KBname = _.get(projectKB, 'name', '-');
    },
    onRename(analysis) {
      this.showRenameModal = true;
      this.selectedAnalysisToRename = analysis;
    },
    async onRenameModalConfirm(newName) {
      const oldName = this.selectedAnalysisToRename && this.selectedAnalysisToRename.title;

      // updating qualitative analysis
      const id = this.selectedAnalysisToRename && this.selectedAnalysisToRename.id;
      if (id && oldName !== newName) {
        modelService.updateModelMetadata(id, { name: newName }).then(() => {
          this.selectedAnalysisToRename.title = newName;
          this.toaster(CAG.SUCCESSFUL_RENAME, 'success', false);
        }).catch(() => {
          this.toaster(CAG.ERRONEOUS_RENAME, 'error', true);
        });
      }

      // updating data analysis
      const analysisId = this.selectedAnalysisToRename && this.selectedAnalysisToRename.analysisId;
      if (analysisId && oldName !== newName) {
        try {
          await updateAnalysis(analysisId, { title: newName });
          this.selectedAnalysisToRename.title = newName;
          this.toaster(ANALYSIS.SUCCESSFUL_RENAME, 'success', false);
        } catch (e) {
          this.toaster(ANALYSIS.ERRONEOUS_RENAME, 'error', true);
        }
      }

      this.onRenameModalClose();
    },
    onRenameModalClose() {
      this.showRenameModal = false;
    },
    async onDuplicate(analysis) {
      if (analysis.analysisId) {
        try {
          const copy = await duplicateAnalysis(analysis.analysisId);
          const duplicatedAnalysis = toQuantitative(copy);
          duplicatedAnalysis.title = analysis.title; // FIXME @HACK since duplicateAnalysis() does not return a full object copy
          this.analyses.unshift(duplicatedAnalysis);
          this.toaster(ANALYSIS.SUCCESSFUL_DUPLICATE, 'success', false);
        } catch (e) {
          this.toaster(ANALYSIS.ERRONEOUS_DUPLICATE, 'error', true);
        }
      }
      if (analysis.id) { // cag-id
        modelService.duplicateModel(analysis.id).then((copy) => {
          const duplicatedAnalysis = toQualitative(copy);
          duplicatedAnalysis.title = analysis.title; // FIXME @HACK since duplicateModel() does not return a full object copy
          this.analyses.unshift(duplicatedAnalysis);
          this.toaster(CAG.SUCCESSFUL_DUPLICATE, 'success', false);
        }).catch(() => {
          this.toaster(CAG.ERRONEOUS_DUPLICATE, 'error', true);
        });
      }
    },
    async onDelete(analysis) {
      if (analysis.analysisId) {
        try {
          await deleteAnalysis(analysis.analysisId);
          this.analyses = this.analyses.filter(item => item.analysisId !== analysis.analysisId);
          this.toaster(ANALYSIS.SUCCESSFUL_DELETION, 'success', false);
        } catch (e) {
          this.toaster(ANALYSIS.ERRONEOUS_DELETION, 'error', true);
        }
      }
      if (analysis.id) { // cag-id
        modelService.removeModel(analysis.id).then(() => {
          this.analyses = this.analyses.filter(item => item.id !== analysis.id);
          this.toaster(CAG.SUCCESSFUL_DELETION, 'success', false);
        }).catch(() => {
          this.toaster(CAG.ERRONEOUS_DELETION, 'error', true);
        });
      }
    },
    onOpen(analysis) {
      const params = {
        project: this.project,
        projectType: ProjectType.Analysis
      };
      let name = '';
      if (analysis.analysisId) {
        params.analysisId = analysis.analysisId;
        name = 'dataComparative';
      }
      if (analysis.id) { // cag-id
        params.currentCAG = analysis.id;
        name = 'qualitative';
      }
      this.$router.push({
        name,
        params
      });
    },
    onCreateCAG() {
      modelService.newModel(this.project, `untitled at ${dateFormatter(Date.now())}`).then(result => {
        this.$router.push({
          name: 'qualitative',
          params: {
            project: this.project,
            currentCAG: result.id,
            projectType: ProjectType.Analysis
          }
        });
      });
    },
    async onCreateDataAnalysis() {
      const initialAnalysisState = { // AnalysisState
        currentAnalysisId: '',
        analysisItems: []
      };
      const analysis = await createAnalysis({
        title: `untitled at ${dateFormatter(Date.now())}`,
        projectId: this.project,
        state: initialAnalysisState
      });
      initialAnalysisState.currentAnalysisId = analysis.id;
      await this.updateAnalysisItems(initialAnalysisState);
      this.$router.push({
        name: 'dataComparative',
        params: {
          project: this.project,
          analysisId: analysis.id,
          projectType: ProjectType.Analysis
        }
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
    sortAnalysesByEarliestDate() {
      this.analyses.sort((a, b) => {
        return a.modified_at && b.modified_at ? a.modified_at - b.modified_at : 0;
      });
    },
    sortAnalyses(option) {
      this.selectedAnalysisSortingOption = option;
      this.showSortingDropdownAnalyses = false;
      switch (option) {
        case this.analysisSortingOptions[0]:
          this.sortAnalysesByMostRecentDate();
          break;
        case this.analysisSortingOptions[1]:
          this.sortAnalysesByEarliestDate();
          break;
        default:
          this.sortAnalysesByMostRecentDate();
      }
    }
  }
};
</script>

<style lang="scss" scoped>

$padding-size: 2vh;
.project-overview-container {
  padding-top: 0;
}

.map-image {
  height: 100%;
  float: right;
}

.insight-container {
  background-color: white;
  height: 70vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding-top: 1rem;
}

.edit-model-desc {
  font-size: medium;
  color: blue;
  cursor: pointer;
}

.model-attribute-desc {
  border-width: 1px;
  border-color: rgb(216, 214, 214);
  min-width: 85%;
  flex-basis: 85%;
}

.tags-container {
  display: flex;
  padding-top: 10px;
  flex-wrap: wrap;
}

.tag {
  margin: 2px;
  padding: 4px;
  border-style: solid;
  border-width: thin;
  border-color: darkgrey;
  background-color: lightgray;
  border-radius: 4px;
}

.analyses-list-elements {
  height: 65vh;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

.maintainer {
  background-color: lightgrey;
  border-style: solid;
  border-width: 1px;
  border-color: darkgrey;
  padding-left: 5px;
  padding-right: 5px;
  margin: 5px;
}

.row {
  padding-left: $padding-size / 2;
}

.row-header {
  padding-left: $padding-size;
}

.header-prompt {
  font-weight: normal;
  font-size: 28px;
  margin-top: 0;
  text-align: center;
}

.descriptions {
  display: flex;
  font-size: large;
}

.descriptions {
  margin: 3vh 0;

  & > p {
    color: #747576;
    width: 100%;
  }
}

.cards > .overview-card-container:not(:first-child),
.descriptions > p:not(:first-child) {
  margin-left: 6.25vh;
}

.title {
  display: flex;
  align-items: center;
  div {
    flex: 1;
  }
  .btn-primary {
    margin: 20px 5px 10px;
  }
}

.button-container {
  display: flex;
  justify-content: space-between;
}

.button-spacing {
  padding: 4px;
  margin: 2px;
}

.controls {
  display: flex;
  justify-content: space-between;
  input[type=text] {
    padding: 8px;
    width: 250px;
    margin-right: 5px;
  }
  .sorting {
    position: relative;
    .btn {
      width: 180px !important;
      text-align: left;
      .lbl {
        font-weight: normal;
      }
      .fa {
        position:absolute;
        right: 20px;
      }
    }
    .dropdown {
      position: absolute;
      width: 100%;
    }
  }
  .form-control {
    background: #fff;
  }
}
</style>
