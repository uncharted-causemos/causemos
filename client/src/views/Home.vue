<template>
  <div class="home-container">
    <div class="logo-container">
      <img class="logo" src="../assets/causemos-logo-colour.svg" alt="CauseMos logo" />
      <div class="descriptions">
        Understand complex multi-domain issues by leveraging integrated knowledge, data, and models
      </div>
    </div>
    <div class="columns">
      <div class="project-column">
        <div class="title">
          <h3>Analysis Projects</h3>
          <button
            v-tooltip.top-center="'Create a new analysis project'"
            type="button"
            class="btn btn-call-to-action"
            @click="gotoNewProject"
          >
            New Analysis Project
          </button>
        </div>
        <div class="controls">
          <input
            v-model="search"
            type="text"
            placeholder="Search projects..."
            class="form-control"
          />
          <dropdown-button
            :inner-button-label="'Sort by'"
            :items="sortingOptions"
            :selected-item="selectedSortingOption"
            @item-selected="sort"
          />
        </div>
        <div class="projects-list">
          <div class="projects-list-header">
            <div class="table-column extra-wide">Name</div>
            <div class="table-column">Analyses</div>
            <div class="table-column">Updated</div>
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
          >
            New Domain Model Project
          </button>
        </div>
        <div class="controls">
          <radio-button-group
            :selected-button-value="selectedDataType"
            :buttons="[
              { label: 'Domain Models', value: 'models' },
              { label: 'Datasets', value: 'datasets' },
            ]"
            @button-clicked="setDataType"
          />
          <input
            v-model="searchDomainDatacubes"
            type="text"
            :placeholder="`Search ${selectedDataType}...`"
            class="form-control"
          />
          <dropdown-button
            :inner-button-label="'Sort by'"
            :items="sortingOptions"
            :selected-item="selectedDatacubeSortingOption"
            @item-selected="setDatacubeSort"
          />
        </div>
        <div class="projects-list">
          <div v-if="selectedDataType === 'models'" class="projects-list-header">
            <div class="table-column extra-wide">Family name</div>
            <div class="table-column">Published Instances</div>
            <div class="table-column">Registered Instances</div>
            <div class="table-column extra-wide">Source</div>
            <div class="table-column">Updated</div>
            <div class="table-column extra-small">
              <!-- no title necessary for delete button column -->
            </div>
          </div>
          <div v-else class="projects-list-header">
            <div class="table-column extra-wide">Dataset name</div>
            <div class="table-column">Indicators</div>
            <div class="table-column extra-wide">Source</div>
            <div class="table-column">Registered</div>
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
import { mapActions } from 'vuex';
import projectService from '@/services/project-service';
import ProjectCard from '@/components/home/project-card.vue';
import DomainDatacubeProjectCard from '@/components/home/domain-datacube-project-card.vue';
import RadioButtonGroup from '@/components/widgets/radio-button-group.vue';
import { Project, DomainProject, DatasetInfo, DatacubeFamily } from '@/types/Common';
import domainProjectService from '@/services/domain-project-service';
import DropdownButton from '@/components/dropdown-button.vue';
import API from '@/api/api';
import { modifiedAtSorter, nameSorter, sortItem, SortOptions } from '@/utils/sort/sort-items';
import { ProjectType } from '@/types/Enums';

export default defineComponent({
  name: 'Home',
  components: {
    ProjectCard,
    DomainDatacubeProjectCard,
    DropdownButton,
    RadioButtonGroup,
  },
  data: () => ({
    search: '',
    projectsList: [] as Project[],
    showSortingDropdown: false,
    sortingOptions: Object.values(SortOptions),
    selectedSortingOption: SortOptions.MostRecent,
    searchDomainDatacubes: '',
    projectsListDomainDatacubes: [] as DomainProject[],
    datasetsList: [] as DatasetInfo[],
    showSortingDropdownDomainDatacubes: false,
    selectedDatacubeSortingOption: SortOptions.MostRecent,
    selectedDataType: 'models',

    domainProjectStats: {} as { [key: string]: any },
  }),
  computed: {
    filteredProjects(): Project[] {
      return this.projectsList.filter((project) => {
        return project.name.toLowerCase().includes(this.search.toLowerCase());
      });
    },
    filteredFamilyList(): DatacubeFamily[] {
      const familyList: DatacubeFamily[] =
        this.selectedDataType === 'models'
          ? this.projectsListDomainDatacubes.map((domainModel) => {
              const stats = this.domainProjectStats[domainModel.name];
              return {
                id: domainModel.id || '',
                name: domainModel.name || '',
                type: domainModel.type,
                numReady: stats && stats.READY ? stats.READY : 0,
                numDraft: stats && stats.REGISTERED ? stats.REGISTERED : 0,
                source:
                  (domainModel.source ||
                    (domainModel.maintainer && domainModel.maintainer[0]?.organization)) ??
                  '',
                modified_at: domainModel.modified_at || domainModel.created_at || 0,
              };
            })
          : this.datasetsList.map((dataset) => ({
              id: dataset.data_id,
              name: dataset.name,
              type: 'dataset',
              numReady: dataset.indicator_count,
              numDraft: 0,
              source: dataset.source ?? '',
              modified_at: dataset.created_at,
            }));
      const filtered = familyList.filter((family) =>
        family.name.toLowerCase().includes(this.searchDomainDatacubes.toLowerCase())
      );
      return sortItem(
        filtered,
        { date: modifiedAtSorter, name: nameSorter },
        this.selectedDatacubeSortingOption
      );
    },
  },
  mounted() {
    this.refresh();
    this.refreshDomainProjects();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
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
      projectService.getProjects().then((projects) => {
        this.projectsList = projects;
        this.projectsList = sortItem(
          this.projectsList,
          { date: modifiedAtSorter, name: nameSorter },
          SortOptions.MostRecent
        );
      });
    },
    async refreshDomainProjects() {
      this.enableOverlay('Loading projects');
      this.domainProjectStats = await domainProjectService.getProjectsStats();

      const domainProjectSearchFields = {
        // DomainProjectFilterFields
        type: 'model',
      };
      const existingProjects: DomainProject[] = await domainProjectService.getProjects(
        domainProjectSearchFields
      );

      this.projectsListDomainDatacubes = existingProjects;

      const { data } = await API.get('maas/datacubes/datasets');
      this.datasetsList = data;

      this.disableOverlay();
    },
    async gotoNewProject() {
      const id = await projectService.createProject('Untitled project', 'Project description');
      this.$router.push({
        name: 'overview',
        params: { project: id, projectType: ProjectType.Analysis },
      });
    },
    gotoNewFamilyProject() {
      this.$router.push('newDomainProject');
    },
    toggleSortingDropdown() {
      this.showSortingDropdown = !this.showSortingDropdown;
    },
    sort(option: SortOptions) {
      this.selectedSortingOption = option;
      this.showSortingDropdown = false;
      this.projectsList = sortItem(
        this.projectsList,
        { date: modifiedAtSorter, name: nameSorter },
        this.selectedSortingOption
      );
    },
    setDatacubeSort(option: SortOptions) {
      this.selectedDatacubeSortingOption = option;
      this.showSortingDropdownDomainDatacubes = false;
    },
    setDataType(type: string) {
      this.selectedDataType = type;
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
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
  margin-top: calc(calc(#{$padding-size} / 2) - 10px);
  text-align: center;

  .logo {
    height: $padding-size;
    position: relative;
    // Nudge the logo left a little to look more visually centered
    left: calc(-#{$padding-size} / 6);
  }

  .descriptions {
    font-size: x-large;
    text-align: center;
    margin-bottom: calc(calc(#{$padding-size} / 2) - 10px);
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

  input[type='text'] {
    padding: 8px;
    width: 250px;
    margin-right: 10px;
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
</style>
