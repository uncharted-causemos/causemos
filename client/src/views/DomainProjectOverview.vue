<template>
  <div class="project-overview-container">
    <header>
      <div class="metadata-column">
        <h3>{{ projectMetadata.name }}</h3>
        <div class="description">
          <div v-if="!isEditingDesc">
            {{ projectMetadata.description }}
          </div>
          <textarea
            v-else
            v-model="projectMetadata.description"
            type="text"
            class="model-attribute-desc"
          />
          <span
            class="edit-model-desc"
            @click="updateDesc"
            v-tooltip.top-center="'Edit description'"
          >
            <i class="fa fa-edit" />
          </span>
        </div>
        <a
          :href="maintainerWebsite"
          target="_blank"
          rel="noopener noreferrer"
          style="color: blue"
        >
          {{ maintainerWebsite }}
        </a>
        <div>
          <strong>Maintainer</strong>
          <span class="maintainer">{{ projectSource }}</span>
        </div>
      </div>
      <div v-if="tags.length > 0" class="tags-column">
        <strong>Tags</strong>
        <span v-for="tag in tags" :key="tag" class="tag">
          {{ tag }}
        </span>
      </div>
      <div class="map">
        <!-- placeholder for family regional image -->
      </div>
    </header>
    <main>
      <div class="insights-column">
        <div class="column-title">Insights</div>
        <list-context-insight-pane class="insights" :allow-new-insights="false" />
      </div>
      <div class="instance-list-column">
        <div class="instance-list-header">
          <div class="column-title">Instances</div>
          <div class="controls">
            <button
              class="btn btn-primary btn-call-for-action"
              disabled>
                Register New Model Instance in DOJO
            </button>
            <input
              v-model="searchDatacubeInstances"
              type="text"
              placeholder="Search ..."
              class="form-control"
            >
            <div class="sorting">
              <div>
                <button
                  type="button"
                  class="btn btn-default"
                  @click="toggleSortingDropdownDatacubeInstances"
                ><span class="lbl">Sort by</span> - {{ selectedSortingOptionDatacubeInstances }}
                  <i class="fa fa-caret-down" />
                </button>
              </div>
              <div v-if="showSortingDropdownDatacubeInstances">
                <dropdown-control class="dropdown">
                  <template #content>
                    <div
                      v-for="option in sortingOptionsDatacubeInstances"
                      :key="option"
                      class="dropdown-option"
                      @click="sortDatacubeInstances(option)">
                      {{ option }}
                    </div>
                  </template>
                </dropdown-control>
              </div>
            </div>
          </div>
        </div>
        <div class="instance-list">
          <domain-datacube-instance-card
            v-for="instance in filteredDatacubeInstances"
            :key="instance.id"
            :datacube="instance"
            @unpublish="unpublishInstance(instance)"
          />
          <message-display
            v-if="filteredDatacubeInstances.length === 0"
            :message-type="'alert-warning'"
            :message="'No registered model instances!'"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import DomainDatacubeInstanceCard from '@/components/domain-datacube-instance-card.vue';
import filtersUtil from '@/utils/filters-util';
import { getDatacubes } from '@/services/new-datacube-service';
import _ from 'lodash';
import ListContextInsightPane from '@/components/context-insight-panel/list-context-insight-pane.vue';
import domainProjectService from '@/services/domain-project-service';
import DropdownControl from '@/components/dropdown-control.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';
import { unpublishDatacubeInstance } from '@/utils/datacube-util';

export default {
  name: 'DomainProjectOverview',
  components: {
    DomainDatacubeInstanceCard,
    ListContextInsightPane,
    DropdownControl,
    MessageDisplay
  },
  data: () => ({
    datacubeInstances: [],
    searchDatacubeInstances: '',
    showSortingDropdownDatacubeInstances: false,
    sortingOptionsDatacubeInstances: ['Most recent', 'Earliest'],
    selectedSortingOptionDatacubeInstances: 'Most recent',
    isEditingDesc: false
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      projectMetadata: 'app/projectMetadata',
      refreshDatacubes: 'insightPanel/refreshDatacubes'
    }),
    filteredDatacubeInstances() {
      return this.datacubeInstances.filter(instance => {
        return instance.name.toLowerCase().includes(this.searchDatacubeInstances.toLowerCase());
      });
    },
    tags() {
      if (!this.datacubeInstances || this.datacubeInstances.length === 0) {
        return [];
      }
      return this.datacubeInstances.map(d => d.tags).flat();
    },
    maintainerWebsite() {
      if (!this.datacubeInstances || this.datacubeInstances.length === 0) {
        return 'Website Unknown!';
      }
      // FIXME: maintainer name, website and tags should be saved at the project level and not fetched from a datacube instance
      return this.datacubeInstances[0].maintainer.website;
    },
    projectSource() {
      if (this.projectMetadata) {
        if (this.projectMetadata.source) {
          return this.projectMetadata.source;
        }
        if (this.projectMetadata.maintainer && this.projectMetadata.maintainer.length > 0) {
          let fullMaintainerInfo = '';
          const name = this.projectMetadata.maintainer[0].name;
          fullMaintainerInfo += name;
          const organization = this.projectMetadata.maintainer[0].organization;
          if (organization !== '') {
            fullMaintainerInfo += ' | ' + organization;
          }
          const email = this.projectMetadata.maintainer[0].email;
          if (email !== '') {
            fullMaintainerInfo += ' | ' + email;
          }
          return fullMaintainerInfo;
        }
      }
      return '';
    }
  },
  watch: {
    projectMetadata: function() {
      this.fetchDatacubeInstances();
    },
    refreshDatacubes: function() {
      if (this.refreshDatacubes) {
        this.fetchDatacubeInstances();
      }
    }
  },
  async mounted() {
    this.fetchDatacubeInstances();

    // ensure the insight explorer panel is closed in case the user has
    //  previously opened it and clicked the browser back button
    this.hideInsightPanel();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      setContextId: 'insightPanel/setContextId',
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      setSelectedScenarioIds: 'modelPublishStore/setSelectedScenarioIds',
      setRefreshDatacubes: 'insightPanel/setRefreshDatacubes'
    }),
    updateDesc() {
      if (this.isEditingDesc) {
        // we may have just modified the desc text, so update the server value
        domainProjectService.updateDomainProject(this.project, { description: this.projectMetadata.description });
      }
      this.isEditingDesc = !this.isEditingDesc;
    },
    async fetchDatacubeInstances() {
      if (_.isEmpty(this.projectMetadata)) {
        return;
      }

      this.enableOverlay('Loading datacube family instances');

      // fetch model instances
      const newFilters = filtersUtil.newFilters();
      filtersUtil.addSearchTerm(newFilters, 'familyName', this.projectMetadata.name, 'and', false);
      filtersUtil.addSearchTerm(newFilters, 'type', this.projectMetadata.type, 'and', false);
      this.datacubeInstances = await getDatacubes(newFilters);

      // set context id as the current family name
      if (this.datacubeInstances.length > 0) {
        // context-id should be an array to fetch insights for each and every model instance
        const contextIDs = this.datacubeInstances.map(dc => dc.id);
        this.setContextId(contextIDs);
      } else {
        // no datacubes were found, do not fetch any insights/questions
        this.setContextId(undefined);
      }

      // reset to avoid invalid data fetch when a given instance it loaded
      //  while the info of a previous instance is cached in the store
      this.setSelectedScenarioIds([]);

      // Sort by modified_at date with latest on top
      this.sortDatacubeInstancesByMostRecentDate();

      this.disableOverlay();

      // reset the flag that is often needed to request a refresh when the last public insight is removed
      this.setRefreshDatacubes(false);
    },
    unpublishInstance(instance) {
      unpublishDatacubeInstance(instance, this.project);
    },
    toggleSortingDropdownDatacubeInstances() {
      this.showSortingDropdownDatacubeInstances = !this.showSortingDropdownDatacubeInstances;
    },
    sortDatacubeInstancesByMostRecentDate() {
      this.datacubeInstances.sort((a, b) => {
        return a.modified_at && b.modified_at ? b.modified_at - a.modified_at : 0;
      });
    },
    sortDatacubeInstancesByEarliestDate() {
      this.datacubeInstances.sort((a, b) => {
        return a.modified_at && b.modified_at ? a.modified_at - b.modified_at : 0;
      });
    },
    sortDatacubeInstances(option) {
      this.selectedSortingOptionDatacubeInstances = option;
      this.showSortingDropdownDatacubeInstances = false;
      switch (option) {
        case this.sortingOptionsDatacubeInstances[0]:
          this.sortDatacubeInstancesByMostRecentDate();
          break;
        case this.sortingOptionsDatacubeInstances[1]:
          this.sortDatacubeInstancesByEarliestDate();
          break;
        default:
          this.sortDatacubeInstancesByMostRecentDate();
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables";

$padding-size: 3vh;
.project-overview-container {
  display: flex;
  flex-direction: column;
  height: $content-full-height;
}

header {
  height: 25vh;
  display: flex;
  padding: 20px;
  padding-bottom: 0;
}

.metadata-column {
  flex: 1;
  min-width: 0;
  overflow: auto;

  h3 {
    margin: 0;
  }

  & > *:not(:first-child) {
    margin-top: 5px;
  }

  .description {
    max-width: 90ch;
  }
}

.edit-model-desc {
  font-size: medium;
  color: blue;
  cursor: pointer;
}

.model-attribute-desc {
  border-width: 1px;
  border-color: rgb(216, 214, 214);
  min-width: 100%;
  flex-basis: 100%;
}

.tags-column {
  width: 20vw;
  display: flex;
  flex-wrap: wrap;
  align-self: flex-start;

  strong {
    align-self: center;
    margin-right: 5px;
  }
}

.map {
  width: 20vw;
  background: #ddd;
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

.column-title {
  font-size: x-large;
  padding-right: 4px;
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
  margin-top: 18px;
  flex: 1;
  min-height: 0;
}

.instance-list-column {
  flex: 3;
  display: flex;
  flex-direction: column;
  margin-left: 10px;
}

.instance-list-header {
  display: flex;
  justify-content: space-between;
}

.instance-list {
  margin-top: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.max-content-height {
  height: 60vh;
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
  padding-left: $padding-size;
  padding-right: $padding-size;
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

.projects-list {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  .projects-list-elements {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }
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
