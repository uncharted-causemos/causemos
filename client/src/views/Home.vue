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
      <div class="project-column">
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
            class="btn btn-primary"
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
          <h3>Domain Model Projects</h3>
          <button
            v-tooltip.top-center="'Create a new domain family project'"
            type="button"
            class="btn btn-primary"
            @click="gotoNewFamilyProject"
          >New Domain Model Project</button>
        </div>
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
        <div class="projects-list">
          <div class="projects-list-header">
            <div class="table-column extra-wide">
              Family name
            </div>
            <div class="table-column">
              Published Instances
            </div>
            <div class="table-column">
              Registered Instances
            </div>
            <div class="table-column">
              <span>Type
              (<span class="datacube-link" @click="addDomainModels=!addDomainModels">M</span>
                  &nbsp;|&nbsp;
                <span class="datacube-link" @click="addDomainIndicators=!addDomainIndicators">I</span>)
              </span>
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
          <div class="projects-list-elements">
            <domain-datacube-project-card
              v-for="project in filteredDomainProjects"
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
import ProjectCard from '@/components/project-card.vue';
import DomainDatacubeProjectCard from '@/components/domain-datacube-project-card.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';
import { Project, DomainProject, KnowledgeBase } from '@/types/Common';
import domainProjectService from '@/services/domain-project-service';
import { DatacubeType } from '@/types/Enums';

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
    addDomainModels: true,
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
        const filteredProject = _.get(project, 'name', '').toLowerCase().includes(this.searchDomainDatacubes.toLowerCase());

        if (project.type === DatacubeType.Indicator) {
          return filteredProject && this.addDomainIndicators;
        } else if (project.type === DatacubeType.Model) {
          return filteredProject && this.addDomainModels;
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

      const domainProjectSearchFields = { // DomainProjectFilterFields
        type: 'model'
      };
      const existingProjects: DomainProject[] = await domainProjectService.getProjects(domainProjectSearchFields);

      this.projectsListDomainDatacubes = existingProjects;

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
    gotoNewFamilyProject() {
      this.$router.push('newDomainProject');
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
  background-color: ghostwhite;
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
