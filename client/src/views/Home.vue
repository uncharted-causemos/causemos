<template>
  <div class="container-fluid">
    <div class="row page-container">
      <div class="col-md-6 page-content">
        <div class="row title">
          <h3>Analysis Projects</h3>
          <message-display
            v-if="newKnowledgeBase"
            :message="'New Knowledge Base (KB): Create a new project to check out the newly created KB.'"
            :message-type="'primary'"
            :dismissable="true"
            @dismiss="onDismiss" />
          <button
            v-tooltip.top-center="'Create a new project'"
            type="button"
            class="btn btn-primary new-project"
            @click="gotoNewProject"
          >New Project</button>
        </div>
        <hr>
        <div class="row">
          <div class="controls">
            <input
              v-model="search"
              type="text"
              placeholder="Search projects..."
              class="form-control"
            >
            <div class="sorting">
              <div>
                <button
                  type="button"
                  class="btn btn-default"
                  @click="toggleSortingDropdown"
                ><span class="lbl">Sort by</span> - {{ selectedSortingOption }}
                  <i class="fa fa-caret-down" />
                </button>
              </div>
              <div v-if="showSortingDropdown">
                <dropdown-control class="dropdown">
                  <template #content>
                    <div
                      v-for="option in sortingOptions"
                      :key="option"
                      class="dropdown-option"
                      @click="sort(option)">
                      {{ option }}
                    </div>
                  </template>
                </dropdown-control>
              </div>
            </div>
          </div>
        </div>
        <div class="row projects-list">
          <div class="row projects-list-header">
            <div class="col-sm-4">
              Name
            </div>
            <div class="col-sm-2 number-col">
              # Analyses
            </div>
            <div class="col-sm-4">
              Knowledge Base
            </div>
            <div class="col-sm-2">
              Last Updated
            </div>
          </div>
          <div class="projects-list-elements">
            <div
              v-for="project in filteredProjects"
              :key="project.id">
              <project-card
                :project="project"
                @delete="deleteProject" />
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-6 page-content">
        <div class="row title">
          <h3>Domain Model Projects</h3>
        </div>
        <hr>
        <div class="row">
          <div class="controls">
            <input
              v-model="searchDomainModels"
              type="text"
              placeholder="Search projects..."
              class="form-control"
            >
            <div class="sorting">
              <div>
                <button
                  type="button"
                  class="btn btn-default"
                  @click="toggleSortingDropdownDomainModels"
                ><span class="lbl">Sort by</span> - {{ selectedSortingOptionDomainModel }}
                  <i class="fa fa-caret-down" />
                </button>
              </div>
              <div v-if="showSortingDropdownDomainModels">
                <dropdown-control class="dropdown">
                  <template #content>
                    <div
                      v-for="option in sortingOptionsDomainModels"
                      :key="option"
                      class="dropdown-option"
                      @click="sortDomainModels(option)">
                      {{ option }}
                    </div>
                  </template>
                </dropdown-control>
              </div>
            </div>
          </div>
        </div>
        <div class="row projects-list">
          <div class="row projects-list-header">
            <div class="col-sm-4">
              Model-family-name
            </div>
            <div class="col-sm-2 number-col">
              # Published Instances
            </div>
            <div class="col-sm-2 number-col">
              # Registered Instances
            </div>
            <div class="col-sm-2">
              Source
            </div>
            <div class="col-sm-2">
              Last Updated
            </div>
          </div>
          <div class="projects-list-elements">
            <div
              v-for="project in filteredDomainModelProjects"
              :key="project.id">
              <domain-model-project-card
                :project="project"
                @delete="deleteDomainModelProject" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapActions } from 'vuex';
import projectService from '@/services/project-service';
import ProjectCard from '@/components/project-card.vue';
import DomainModelProjectCard from '@/components/domain-model-project-card.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';
import { Project, DomainModelProject, KnowledgeBase } from '@/types/Common';
import filtersUtil from '@/utils/filters-util';
import { getDatacubes } from '@/services/new-datacube-service';
import domainModelProjectService from '@/services/domain-model-project-service';
import { Model } from '@/types/Datacube';
import { DatacubeStatus } from '@/types/Enums';
import _ from 'lodash';


export default defineComponent({
  name: 'Home',
  components: {
    ProjectCard,
    DomainModelProjectCard,
    DropdownControl,
    MessageDisplay
  },
  data: () => ({
    search: '',
    projectsList: [] as Project[],
    showSortingDropdown: false,
    sortingOptions: ['Most recent', 'Earliest'],
    selectedSortingOption: 'Most recent',
    newKnowledgeBase: false,
    //
    searchDomainModels: '',
    projectsListDomainModels: [] as DomainModelProject[],
    showSortingDropdownDomainModels: false,
    sortingOptionsDomainModels: ['Most recent', 'Earliest'],
    selectedSortingOptionDomainModel: 'Most recent'
  }),
  computed: {
    filteredProjects(): Project[] {
      return this.projectsList.filter(project => {
        return project.name.toLowerCase().includes(this.search.toLowerCase());
      });
    },
    filteredDomainModelProjects(): DomainModelProject[] {
      return this.projectsListDomainModels.filter(project => {
        return project.name.toLowerCase().includes(this.searchDomainModels.toLowerCase());
      });
    }
  },
  mounted() {
    this.refresh();
    this.refreshDomainModels();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      isDomainModelProject: 'app/isDomainModelProject'
    }),
    deleteProject(project: Project) {
      this.enableOverlay(`Deleting project '${project.name}'`);
      projectService.deleteProject(project.id).then(() => {
        this.disableOverlay();
        this.refresh();
      });
    },
    deleteDomainModelProject(project: DomainModelProject) {
      this.enableOverlay(`Deleting domain model project '${project.name}'`);
      domainModelProjectService.deleteProject(project.id).then(() => {
        this.disableOverlay();
        this.refreshDomainModels();
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
    async refreshDomainModels() {
      // fetch all model datacubes, extract model families, and ensure a project for each
      const existingProjects: DomainModelProject[] = await domainModelProjectService.getProjects();
      const modelFamilyNames = existingProjects.map(p => p.name);

      const newFilters = filtersUtil.newFilters();
      filtersUtil.addSearchTerm(newFilters, 'type', 'model', 'and', false);
      const modelDatacubes: Model[] = await getDatacubes(newFilters);

      // this list will track any existing project that should be updated
      //  because for example a new instance datacube was registered
      const updateProjects: DomainModelProject[] = [];

      // this list will track new projects that should be created
      //  for example because there is a new model family
      const newProjects: {
        name: string;
        published_instances: string[];
        registered_instances: string[];
        desc: string;
        source: string;
      }[] = [];

      // check model families (datacubes) for a one-to-one mapping with projects
      //  and track new ones to create projects for them
      modelDatacubes.forEach(modelDatacube => {
        // is there an existing project for this datacube?
        if (!modelFamilyNames.includes(modelDatacube.name)) {
          newProjects.push({
            name: modelDatacube.name,
            published_instances: [],
            registered_instances: [],
            desc: modelDatacube.description,
            source: modelDatacube.maintainer.organization
          });
        }
      });

      //
      // after we know all existing projects as well as new projects
      // let's check datacubes against them and update (registered/published) counts
      //
      // FIXME: we currently match using substring to manually group datacubes
      //        ideally, we should use family_name instead of name and do a full string comparison
      //
      modelDatacubes.forEach(modelDatacube => {
        // first, update existing projects, if needed
        // are there some existing projects that should include the current model instance/datacube
        const matchingExistingProjects = existingProjects.filter(p => modelDatacube.name.includes(p.name));
        if (matchingExistingProjects.length > 0) {
          matchingExistingProjects.forEach(matchingProject => {
            if (modelDatacube.status === DatacubeStatus.Registered && !matchingProject.registered_instances.includes(modelDatacube.name)) {
              // this is a new model instance datacube, so we need to increase the registered instances of this project
              matchingProject.registered_instances.push(modelDatacube.name);
              updateProjects.push(matchingProject);
            }
            if (modelDatacube.status === DatacubeStatus.Ready && !matchingProject.published_instances.includes(modelDatacube.name)) {
              // this is a new model instance datacube, so we need to increase the published instances of this project
              matchingProject.published_instances.push(modelDatacube.name);
              updateProjects.push(matchingProject);
            }
          });
        }

        // then, against new projects
        const matchingNewProjects = newProjects.filter(p => modelDatacube.name.includes(p.name));
        if (matchingNewProjects.length > 0) {
          matchingNewProjects.forEach(matchingProject => {
            if (modelDatacube.status === DatacubeStatus.Registered && !matchingProject.registered_instances.includes(modelDatacube.name)) {
              // this is a new model instance datacube, so we need to increase the registered instances of this project
              matchingProject.registered_instances.push(modelDatacube.name);
            }
            if (modelDatacube.status === DatacubeStatus.Ready && !matchingProject.published_instances.includes(modelDatacube.name)) {
              // this is a new model instance datacube, so we need to increase the published instances of this project
              matchingProject.published_instances.push(modelDatacube.name);
            }
          });
        }
      });

      // update existing projects
      const updatePromises = _.uniqBy(updateProjects, 'id').map(async (projectInfo) => {
        return domainModelProjectService.updateDomainModelProject(projectInfo.id, {
          registered_instances: projectInfo.registered_instances,
          published_instances: projectInfo.published_instances
        });
      });
      await Promise.all(updatePromises);

      // create new projects
      const createPromises = newProjects.map(async (projectInfo) => {
        return domainModelProjectService.createDomainModelProject(
          projectInfo.name,
          projectInfo.desc,
          projectInfo.source,
          projectInfo.published_instances,
          projectInfo.registered_instances);
      });
      await Promise.all(createPromises);

      // since the ultimate list of projects may have changed, fetch the latest and use it
      const allProjects: DomainModelProject[] = await domainModelProjectService.getProjects();
      this.projectsListDomainModels = allProjects;

      // Sort by modified_at date with latest on top
      this.sortDomainModelsByMostRecentDate();
    },
    onDismiss() {
      this.newKnowledgeBase = false;
    },
    gotoNewProject() {
      this.isDomainModelProject(false);
      this.$router.push('newProject');
    },
    toggleSortingDropdown() {
      this.showSortingDropdown = !this.showSortingDropdown;
    },
    toggleSortingDropdownDomainModels() {
      this.showSortingDropdownDomainModels = !this.showSortingDropdownDomainModels;
    },
    sortByMostRecentDate() {
      this.projectsList.sort((a, b) => {
        return b.modified_at - a.modified_at;
      });
    },
    sortDomainModelsByMostRecentDate() {
      this.projectsListDomainModels.sort((a, b) => {
        return b.modified_at - a.modified_at;
      });
    },
    sortByEarliestDate() {
      this.projectsList.sort((a, b) => {
        return a.modified_at - b.modified_at;
      });
    },
    sortDomainModelsByEarliestDate() {
      this.projectsListDomainModels.sort((a, b) => {
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
    sortDomainModels(option: string) {
      this.selectedSortingOptionDomainModel = option;
      this.showSortingDropdownDomainModels = false;
      switch (option) {
        case this.sortingOptionsDomainModels[0]:
          this.sortDomainModelsByMostRecentDate();
          break;
        case this.sortingOptionsDomainModels[1]:
          this.sortDomainModelsByEarliestDate();
          break;
        default:
          this.sortDomainModelsByMostRecentDate();
      }
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.page-container {
  display: flex;
  padding-left: 5rem;
  padding-right: 5rem
}

.title {
  display: flex;
  align-items: center;
  h3 {
    flex: 1;
  }
  .btn-primary {
    margin: 20px 5px 10px;
  }
}
hr {
  margin: 5px;
}
.projects-list {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  .projects-list-header {
    box-sizing: border-box;
    border: 1px solid #bbb;
    margin: 1px 0;
    background: #fcfcfc;
    font-weight: bold;
    padding: 10px;
  }
  .projects-list-elements {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }
}
.controls {
  display: flex;
  padding-bottom: 5px;
  margin-top: 5px;
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

.page-content {
  max-height: $content-full-height;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-left: 1rem;
  margin-right: 1rem;
}

.number-col {
  text-align: center;
}
</style>
