<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-md-1" />
      <div class="col-md-10 page-content">
        <div class="row title">
          <h2>Projects</h2>
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
        <div class="row">
          <hr>
        </div>
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
                  <div slot="content">
                    <div
                      v-for="option in sortingOptions"
                      :key="option"
                      class="dropdown-option"
                      @click="sort(option)">
                      {{ option }}
                    </div>
                  </div>
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
              # Data Analysis
            </div>
            <div class="col-sm-2 number-col">
              # Models
            </div>
            <div class="col-sm-2">
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
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';
import projectService from '@/services/project-service';
import ProjectCard from '@/components/project-card';
import DropdownControl from '@/components/dropdown-control';
import MessageDisplay from '@/components/widgets/message-display';

export default {
  name: 'Home',
  components: {
    ProjectCard,
    DropdownControl,
    MessageDisplay
  },
  data: () => ({
    search: '',
    projectsList: [],
    newCollectionName: '',
    showSortingDropdown: false,
    sortingOptions: ['Most recent', 'Earliest'],
    selectedSortingOption: 'Most recent',
    newKnowledgeBase: false
  }),
  computed: {
    filteredProjects() {
      return this.projectsList.filter(project => {
        return project.name.toLowerCase().includes(this.search.toLowerCase());
      });
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay'
    }),
    deleteProject(project) {
      this.showModal = false;
      this.enableOverlay(`Deleting project '${project.name}'`);
      projectService.deleteProject(project.id).then(() => {
        this.disableOverlay();
        this.refresh();
      });
    },
    refresh() {
      projectService.getProjects().then(projects => {
        this.projectsList = projects;
        this.projectsList.forEach(project => {
          this.$set(project, 'isOpen', false);
        });
        // Sort by modified_at date with latest on top
        this.sortByMostRecentDate();
      });

      // Local Storage is where we are keeping track of all encountered KB for now
      const storage = window.localStorage;

      // Poll the knowledge-base indices for new indices
      projectService.getKBs().then(kbs => {
        kbs.forEach(knowledgeBase => {
          const match = JSON.parse(storage.getItem(knowledgeBase.id));
          if (!match) {
            storage.setItem(knowledgeBase.id, JSON.stringify(knowledgeBase));
            this.newKnowledgeBase = true;
          }
        });
      });
    },
    onDismiss() {
      this.newKnowledgeBase = false;
    },
    gotoNewProject() {
      this.$router.push('newProject');
    },
    toggle(project) {
      project.isOpen = !project.isOpen;
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
    sort(option) {
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
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/wm-theme/wm-theme";
@import "~styles/_variables";

.title {
  display: flex;
  align-items: center;
  h2 {
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
}

.number-col {
  text-align: right;
  padding-right: 20px;
}
</style>
