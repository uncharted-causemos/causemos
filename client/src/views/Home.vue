<template>
  <div class="home-container">
    <div class="logo-container">
      <img
        class="logo"
        src="../assets/causemos-logo-colour.svg"
        alt="CauseMos logo"
      />
      <div class="descriptions">
        Understand complex multi-domain issues by leveraging integrated
        knowledge, data, and models
      </div>
    </div>
    <div class="columns">
      <div
        v-if="applicationConfiguration.CLIENT__IS_ANALYST_WORKFLOW_VISIBLE"
        class="project-column"
      >
        <div class="title">
          <h3>Analysis Projects</h3>
          <message-display
            v-if="newKnowledgeBase"
            :message="'New Knowledge Base (KB): Create a new project to check out the newly created KB.'"
            :message-type="'primary'"
            :dismissable="true"
            @dismiss="onDismiss" />
          <button
            v-tooltip.top-center="'Create a new analysis project'"
            type="button"
            class="btn btn-call-to-action"
            @click="gotoNewProject"
          >New Analysis Project</button>
        </div>
        <div class="controls">
          <input
            v-model="search"
            type="text"
            placeholder="Search projects..."
            class="form-control"
          >
          <dropdown-button
            :inner-button-label="'Sort by'"
            :items="sortingOptions"
            :selected-item="selectedSortingOption"
            @item-selected="sort"
          />
        </div>
        <div class="projects-list">
          <div class="projects-list-header">
            <div class="table-column extra-wide">
              Name
            </div>
            <div class="table-column">
              Analyses
            </div>
            <div class="table-column extra-wide">
              Knowledge Base
            </div>
            <div class="table-column">
              Updated
            </div>
            <div class="table-column extra-small">
              <!-- no title necessary for delete button column -->
            </div>
          </div>
          <div class="projects-list-elements">
            <project-card
              v-for="project in filteredProjects"
              :key="project.id"
              :project="project"
              @delete="deleteProject"
            />
          </div>
        </div>
      </div>
      <div class="project-column">
        <div class="title">
          <h3>Domain Models and Datasets</h3>
          <button
            v-tooltip.top-center="'Create a new domain family project'"
            type="button"
            class="btn btn-call-to-action"
            @click="gotoNewFamilyProject"
          >New Domain Model Project</button>
        </div>
        <div class="controls">
          <radio-button-group
            :selected-button-value="selectedDataType"
            :buttons="[
              { label: 'Domain Models', value: 'models' },
              { label: 'Datasets', value: 'datasets' }
            ]"
            @button-clicked="setDataType"
          />
          <input
            v-model="searchDomainDatacubes"
            type="text"
            :placeholder="`Search ${selectedDataType}...`"
            class="form-control"
          >
          <dropdown-button
            :inner-button-label="'Sort by'"
            :items="sortingOptions"
            :selected-item="selectedDatacubeSortingOption"
            @item-selected="setDatacubeSort"
          />
        </div>
        <div class="projects-list">
          <div v-if="selectedDataType === 'models'" class="projects-list-header">
            <div class="table-column extra-wide">
              Family name
            </div>
            <div class="table-column">
              Published Instances
            </div>
            <div class="table-column">
              Registered Instances
            </div>
            <div class="table-column extra-wide">
              Source
            </div>
            <div class="table-column">
              Updated
            </div>
            <div class="table-column extra-small">
              <!-- no title necessary for delete button column -->
            </div>
          </div>
          <div v-else class="projects-list-header">
            <div class="table-column extra-wide">
              Dataset name
            </div>
            <div class="table-column">
              Indicators
            </div>
            <div class="table-column extra-wide">
              Source
            </div>
            <div class="table-column">
              Registered
            </div>
          </div>
          <div class="projects-list-elements">
            <domain-datacube-project-card
              v-for="project in filteredFamilyList"
              :key="project.id"
              :project="project"
              @delete="deleteDomainProject"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent } from 'vue';
import { mapActions, mapGetters } from 'vuex';
import projectService from '@/services/project-service';
import ProjectCard from '@/components/home/project-card.vue';
import DomainDatacubeProjectCard from '@/components/home/domain-datacube-project-card.vue';
import RadioButtonGroup from '@/components/widgets/radio-button-group.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';
import { Project, DomainProject, KnowledgeBase, DatasetInfo, DatacubeFamily } from '@/types/Common';
import domainProjectService from '@/services/domain-project-service';
import DropdownButton from '@/components/dropdown-button.vue';
import API from '@/api/api';

const DISPLAYED_FAMILY_LIMIT = 100;

export default defineComponent({
  name: 'Home',
  components: {
    ProjectCard,
    DomainDatacubeProjectCard,
    MessageDisplay,
    DropdownButton,
    RadioButtonGroup
  },
  data: () => ({
    search: '',
    projectsList: [] as Project[],
    showSortingDropdown: false,
    sortingOptions: ['Most recent', 'Oldest'],
    selectedSortingOption: 'Most recent',
    newKnowledgeBase: false,
    searchDomainDatacubes: '',
    projectsListDomainDatacubes: [] as DomainProject[],
    datasetsList: [] as DatasetInfo[],
    showSortingDropdownDomainDatacubes: false,
    selectedDatacubeSortingOption: 'Most recent',
    selectedDataType: 'models',

    domainProjectStats: {} as { [key: string]: any }
  }),
  computed: {
    filteredProjects(): Project[] {
      return this.projectsList.filter(project => {
        return project.name.toLowerCase().includes(this.search.toLowerCase());
      });
    },
    filteredFamilyList(): DatacubeFamily[] {
      const familyList: DatacubeFamily[] = this.selectedDataType === 'models'
        ? this.projectsListDomainDatacubes.map(domainModel => {
          const stats = this.domainProjectStats[domainModel.name];
          return {
            id: domainModel.id || '',
            name: domainModel.name || '',
            type: domainModel.type,
            numReady: stats && stats.READY ? stats.READY : 0,
            numDraft: stats && stats.REGISTERED ? stats.REGISTERED : 0,
            source: (domainModel.source || (domainModel.maintainer && domainModel.maintainer[0]?.organization)) ?? '',
            modifiedAt: domainModel.modified_at || domainModel.created_at || 0
          };
        })
        : this.datasetsList.map(dataset => ({
          id: dataset.data_id,
          name: dataset.name,
          type: 'dataset',
          numReady: dataset.indicator_count,
          numDraft: 0,
          source: dataset.source ?? '',
          modifiedAt: dataset.created_at
        }));
      const filtered = familyList.filter(family => family.name.toLowerCase()
        .includes(this.searchDomainDatacubes.toLowerCase()));

      const sortFunc = this.sortingOptions.indexOf(this.selectedDatacubeSortingOption) === 1
        ? 'asc' : 'desc';
      return _.orderBy(filtered, 'modifiedAt', sortFunc).slice(0, DISPLAYED_FAMILY_LIMIT);
    },
    ...mapGetters({
      applicationConfiguration: 'app/applicationConfiguration'
    })
  },
  mounted() {
    this.refresh();
    this.refreshDomainProjects();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay'
    }),
    deleteProject(project: Project) {
      this.enableOverlay(`Deleting project '${project.name}'`);
      projectService.deleteProject(project.id).then(() => {
        this.disableOverlay();
        this.refresh();
      });
    },
    deleteDomainProject(project: DomainProject) {
      this.enableOverlay(`Deleting domain model project '${project.name}'`);
      domainProjectService.deleteProject(project.id ?? '').then(() => {
        this.disableOverlay();
        this.refreshDomainProjects();
      });
    },
    refresh() {
      projectService.getProjects().then(projects => {
        this.projectsList = projects;
        // Sort by modified_at date with latest on top
        this.sortByMostRecentDate();
      });

      // Local Storage is where we are keeping track of all encountered KB for now
      const storage = window.localStorage;

      // Poll the knowledge-base indices for new indices
      projectService.getKBs().then(kbs => {
        kbs.forEach((knowledgeBase: KnowledgeBase) => {
          const match = JSON.parse(storage.getItem(knowledgeBase.id) as string);
          if (!match) {
            storage.setItem(knowledgeBase.id, JSON.stringify(knowledgeBase));
            this.newKnowledgeBase = true;
          }
        });
      });
    },
    async refreshDomainProjects() {
      this.enableOverlay('Loading projects');
      this.domainProjectStats = await domainProjectService.getProjectsStats();

      const domainProjectSearchFields = { // DomainProjectFilterFields
        type: 'model'
      };
      const existingProjects: DomainProject[] = await domainProjectService.getProjects(domainProjectSearchFields);

      this.projectsListDomainDatacubes = existingProjects;

      const { data } = await API.get('maas/datacubes/datasets');
      this.datasetsList = data;

      this.disableOverlay();
    },
    onDismiss() {
      this.newKnowledgeBase = false;
    },
    gotoNewProject() {
      this.$router.push('newProject');
    },
    gotoNewFamilyProject() {
      this.$router.push('newDomainProject');
    },
    toggleSortingDropdown() {
      this.showSortingDropdown = !this.showSortingDropdown;
    },
    sortByMostRecentDate() {
      this.projectsList.sort((a, b) => {
        return b.modified_at - a.modified_at;
      });
    },
    sortByEarliestDate() {
      this.projectsList.sort((a, b) => {
        return a.modified_at - b.modified_at;
      });
    },
    sort(option: string) {
      this.selectedSortingOption = option;
      this.showSortingDropdown = false;
      switch (option) {
        case this.sortingOptions[0]:
          this.sortByMostRecentDate();
          break;
        case this.sortingOptions[1]:
          this.sortByEarliestDate();
          break;
        default:
          this.sortByMostRecentDate();
      }
    },
    setDatacubeSort(option: string) {
      this.selectedDatacubeSortingOption = option;
      this.showSortingDropdownDomainDatacubes = false;
    },
    setDataType(type: string) {
      this.selectedDataType = type;
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";
$padding-size: 12.5vh;

.home-container {
  background: white;
  height: $content-full-height;
  display: flex;
  flex-direction: column;
}

.columns {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 2rem;
  background-color: $tinted-background;
}

.logo-container {
  width: 100%;
  margin-top: calc(#{$padding-size / 2} - 10px);
  text-align: center;

  .logo {
    height: $padding-size;
    position: relative;
    // Nudge the logo left a little to look more visually centered
    left: - $padding-size / 6;
  }

  .descriptions {
    font-size: x-large;
    text-align: center;
    margin-bottom: calc(#{$padding-size / 2} - 10px);
  }
}

.title {
  display: flex;
  align-items: center;
  h3 {
    flex: 1;
  }
  div {
    flex: 1;
  }
}
.projects-list {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .projects-list-header {
    display: flex;
    margin: 5px 0;
    align-items: flex-end;
    line-height: 20px;
    min-height: 2 * 20px;
    padding-left: 10px;
    // Add 15px right padding to accommodate for scrollbar
    padding-right: 25px;
  }
  .projects-list-elements {
    flex: 1;
    min-height: 0;
    overflow-y: auto;

    & > *:not(:first-child) {
      margin-top: 1px;
    }
  }
}

.table-column {
  flex: 1;
  min-width: 0;

  &:not(:first-child) {
    margin-left: 5px;
  }

  &.extra-wide {
    flex: 2;
  }

  &.extra-small {
    flex-grow: 0;
    flex-shrink: 0;
    flex-basis: 20px;
  }
}
.controls {
  display: flex;
  justify-content: space-between;
  input[type=text] {
    padding: 8px;
    width: 250px;
    margin-right: 10px;
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

.project-column {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;

  &:not(:first-child) {
    margin-left: 20px;
  }
}

.number-col {
  text-align: right;
}
</style>
