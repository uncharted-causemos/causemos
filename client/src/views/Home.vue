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
          <h3>Domain Model/Indicator Projects</h3>
        </div>
        <hr>
        <div class="row">
          <div class="controls">
            <input
              v-model="searchDomainDatacubes"
              type="text"
              placeholder="Search projects..."
              class="form-control"
            >
            <div class="sorting">
              <div>
                <button
                  type="button"
                  class="btn btn-default"
                  @click="toggleSortingDropdownDomainDatacubes"
                ><span class="lbl">Sort by</span> - {{ selectedSortingOptionDomainDatacube }}
                  <i class="fa fa-caret-down" />
                </button>
              </div>
              <div v-if="showSortingDropdownDomainDatacubes">
                <dropdown-control class="dropdown">
                  <template #content>
                    <div
                      v-for="option in sortingOptionsDomainDatacubes"
                      :key="option"
                      class="dropdown-option"
                      @click="sortDomainDatacubes(option)">
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
              Family name
            </div>
            <div class="col-sm-2 number-col">
              Published (Y | N)
            </div>
            <div class="col-sm-2 number-col">
              <div>Type</div>
              (
                <span class="datacube-link" @click="addDmoainModels=!addDmoainModels">M</span>
                  &nbsp;|&nbsp;
                <span class="datacube-link" @click="addDomainIndicators=!addDomainIndicators">I</span>
              )
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
              v-for="project in filteredDomainProjects"
              :key="project.id">
              <domain-datacube-project-card
                :project="project"
                @delete="deleteDomainProject" />
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
import DomainDatacubeProjectCard from '@/components/domain-datacube-project-card.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';
import { Project, DomainProject, KnowledgeBase } from '@/types/Common';
import filtersUtil from '@/utils/filters-util';
import { getDatacubes } from '@/services/new-datacube-service';
import domainProjectService from '@/services/domain-project-service';
import { Model } from '@/types/Datacube';
import { DatacubeStatus, DatacubeType } from '@/types/Enums';


export default defineComponent({
  name: 'Home',
  components: {
    ProjectCard,
    DomainDatacubeProjectCard,
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
    searchDomainDatacubes: '',
    projectsListDomainDatacubes: [] as DomainProject[],
    showSortingDropdownDomainDatacubes: false,
    sortingOptionsDomainDatacubes: ['Most recent', 'Earliest'],
    selectedSortingOptionDomainDatacube: 'Most recent',
    addDmoainModels: true,
    addDomainIndicators: false
  }),
  computed: {
    filteredProjects(): Project[] {
      return this.projectsList.filter(project => {
        return project.name.toLowerCase().includes(this.search.toLowerCase());
      });
    },
    filteredDomainProjects(): DomainProject[] {
      return this.projectsListDomainDatacubes.filter(project => {
        const filteredProject = project.name.toLowerCase().includes(this.searchDomainDatacubes.toLowerCase());

        if (project.type === DatacubeType.Indicator) {
          return filteredProject && this.addDomainIndicators;
        } else if (project.type === DatacubeType.Model) {
          return filteredProject && this.addDmoainModels;
        } else {
          return filteredProject;
        }
      });
    }
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

      // FIXME: enable this when we have a proper workflow with Jataware
      //  so that on the registeration of a new datacube family,
      //  Causemos is notified and a new project is created with initial counts
      // Causemos backend will cache the counts and update them whenever a datacube is un/published
      const computeCountsOnTheFly = false;
      const existingProjects: DomainProject[] = await domainProjectService.getProjects();

      if (computeCountsOnTheFly) {
        // fetch all model datacubes, extract model families, and ensure a project for each
        const modelFamilyNames = existingProjects.map(p => p.name);

        // FIXME: the following code attempt to compute the project stat counts
        //   (e.g., published instances and registered instances) on the client side
        //  However, this should not be done here and ideally be calculated once
        //   and perhasp cached and provided by the backend as part of the projects information

        const newFilters = filtersUtil.newFilters();
        const datacubes: Model[] = await getDatacubes(newFilters);

        // this list will track new projects that should be created
        //  for example because there is a new model family
        const newProjects: DomainProject[] = [];

        // check model families (datacubes) for a one-to-one mapping with projects
        //  and track new ones to create projects for them
        datacubes.forEach(datacube => {
          // is there an existing project for this datacube?
          if (!modelFamilyNames.includes(datacube.name)) {
            newProjects.push({
              name: datacube.name,
              ready_instances: [],
              draft_instances: [],
              type: datacube.type,
              description: datacube.description,
              source: datacube.maintainer.organization
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
        datacubes.forEach(datacube => {
          // first, update existing projects, if needed
          // are there some existing projects that should include the current model instance/datacube
          const matchingExistingProjects = existingProjects.filter(p => datacube.name.includes(p.name));
          if (matchingExistingProjects.length > 0) {
            matchingExistingProjects.forEach(matchingProject => {
              if (datacube.status === DatacubeStatus.Registered && !matchingProject.draft_instances.includes(datacube.name)) {
                // this is a new model instance datacube, so we need to increase the registered instances of this project
                matchingProject.draft_instances.push(datacube.name);
              }
              if (datacube.status === DatacubeStatus.Ready && !matchingProject.ready_instances.includes(datacube.name)) {
                // this is a new model instance datacube, so we need to increase the published instances of this project
                matchingProject.ready_instances.push(datacube.name);
              }
            });
          }

          // then, against new projects
          const matchingNewProjects = newProjects.filter(p => datacube.name.includes(p.name));
          if (matchingNewProjects.length > 0) {
            matchingNewProjects.forEach(matchingProject => {
              if (datacube.status === DatacubeStatus.Registered && !matchingProject.draft_instances.includes(datacube.name)) {
                // this is a new model instance datacube, so we need to increase the registered instances of this project
                matchingProject.draft_instances.push(datacube.name);
              }
              if (datacube.status === DatacubeStatus.Ready && !matchingProject.ready_instances.includes(datacube.name)) {
                // this is a new model instance datacube, so we need to increase the published instances of this project
                matchingProject.ready_instances.push(datacube.name);
              }
            });
          }
        });

        // create new projects
        if (newProjects.length > 0) {
          const createPromises = newProjects.map(async (projectInfo) => {
            return domainProjectService.createDomainProject(
              projectInfo.name,
              projectInfo.description,
              projectInfo.source,
              projectInfo.type,
              projectInfo.ready_instances,
              projectInfo.draft_instances);
          });
          await Promise.all(createPromises);

          // since the ultimate list of projects may have changed,
          //  fetch (again) the latest list and use it
          const allProjects: DomainProject[] = await domainProjectService.getProjects();
          this.projectsListDomainDatacubes = allProjects;
        } else {
          this.projectsListDomainDatacubes = existingProjects;
        }
      } else {
        this.projectsListDomainDatacubes = existingProjects;
      }

      // Sort by modified_at date with latest on top
      this.sortDomainDatacubesByMostRecentDate();

      this.disableOverlay();
    },
    onDismiss() {
      this.newKnowledgeBase = false;
    },
    gotoNewProject() {
      this.$router.push('newProject');
    },
    toggleSortingDropdown() {
      this.showSortingDropdown = !this.showSortingDropdown;
    },
    toggleSortingDropdownDomainDatacubes() {
      this.showSortingDropdownDomainDatacubes = !this.showSortingDropdownDomainDatacubes;
    },
    sortByMostRecentDate() {
      this.projectsList.sort((a, b) => {
        return b.modified_at - a.modified_at;
      });
    },
    sortDomainDatacubesByMostRecentDate() {
      this.projectsListDomainDatacubes.sort((a, b) => {
        return a.modified_at && b.modified_at ? b.modified_at - a.modified_at : 0;
      });
    },
    sortByEarliestDate() {
      this.projectsList.sort((a, b) => {
        return a.modified_at - b.modified_at;
      });
    },
    sortDomainDatacubesByEarliestDate() {
      this.projectsListDomainDatacubes.sort((a, b) => {
        return a.modified_at && b.modified_at ? a.modified_at - b.modified_at : 0;
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
    sortDomainDatacubes(option: string) {
      this.selectedSortingOptionDomainDatacube = option;
      this.showSortingDropdownDomainDatacubes = false;
      switch (option) {
        case this.sortingOptionsDomainDatacubes[0]:
          this.sortDomainDatacubesByMostRecentDate();
          break;
        case this.sortingOptionsDomainDatacubes[1]:
          this.sortDomainDatacubesByEarliestDate();
          break;
        default:
          this.sortDomainDatacubesByMostRecentDate();
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

.datacube-link {
  color: blue;

  &:hover {
    border-bottom-width: 1px;
    border-bottom-style: solid;
    cursor: pointer;
  }
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
