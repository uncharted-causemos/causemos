<template>
  <div class="project-overview-container">
    <div class="row" style="height: 20vh; margin-bottom: 2rem">
      <div class="col-md-7">
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
        <textarea
          v-if="isEditingDesc"
          v-model="projectMetadata.description"
          type="text"
          class="model-attribute-desc"
        />
        <div style="padding-top: 5px; ">
          <a
            :href="maintainerWebsite"
            target="_blank"
            rel="noopener noreferrer"
            style="color: blue">
            {{ maintainerWebsite }}
          </a>
        </div>
        <div style="padding-top: 5px; ">
          <b>Maintainer: </b>
          <span class="maintainer">{{projectMetadata.source}}</span>
        </div>
      </div>
      <div class="col-md-3 tags-container">
        <b style="flex-basis: 100%">Tags:</b>
        <div
          v-for="tag in tags"
          :key="tag"
          class="tag">
          {{ tag }}
        </div>
      </div>
      <div class="col-md-2" style="backgroundColor: darkgray; height: 100%">
        <!-- placeholder for family regional image -->
      </div>
    </div>
    <hr />
    <div class="col-md-12">
      <div class="col-md-3 max-content-height" style="backgroundColor: white; padding-top: 1rem">
        <list-context-insight-pane :allow-new-insights="false" />
      </div>
      <div class="col-md-9">
        <div class="row">
          <div style="justify-content: space-between; display: flex">
            <div class="instances-title"># Instances</div>
            <div class="controls">
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
        </div>
        <div class="row projects-list">
          <div class="instances-list-elements max-content-height">
            <div
              v-for="instance in filteredDatacubeInstances"
              :key="instance.id">
              <domain-datacube-instance-card
                :datacube="instance"
                @unpublish="unpublishDatacubeInstance(instance)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import DomainDatacubeInstanceCard from '@/components/domain-datacube-instance-card.vue';
import filtersUtil from '@/utils/filters-util';
import { getDatacubes, updateDatacube } from '@/services/new-datacube-service';
import { DatacubeStatus } from '@/types/Enums';
import _ from 'lodash';
import ListContextInsightPane from '@/components/context-insight-panel/list-context-insight-pane.vue';
import domainProjectService from '@/services/domain-project-service';
import DropdownControl from '@/components/dropdown-control.vue';

export default {
  name: 'DomainProjectOverview',
  components: {
    DomainDatacubeInstanceCard,
    ListContextInsightPane,
    DropdownControl
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
      projectMetadata: 'app/projectMetadata'
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
    }
  },
  watch: {
    projectMetadata: function() {
      this.fetchDatacubeInstances();
    }
  },
  async mounted() {
    this.fetchDatacubeInstances();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      setContextId: 'insightPanel/setContextId',
      setSelectedScenarioIds: 'modelPublishStore/setSelectedScenarioIds'
    }),
    updateDesc() {
      if (this.isEditingDesc) {
        // we may have just modified the desc text, so update the server value
        domainProjectService.updateDomainProject(this.projectMetadata.name, { description: this.projectMetadata.description });
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
      this.setContextId('');
      // reset to avoid invalid data fetch when a given instance it loaded
      //  while the info of a previous instance is cached in the store
      this.setSelectedScenarioIds([]);

      // Sort by modified_at date with latest on top
      this.sortDatacubeInstancesByMostRecentDate();

      this.disableOverlay();
    },
    async unpublishDatacubeInstance(instance) {
      // unpublish the datacube instance
      instance.status = DatacubeStatus.Registered;
      await updateDatacube(instance.id, instance);
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

$padding-size: 3vh;
.project-overview-container {
  padding-top: 0;
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

.instances-title {
  font-size: x-large;
}

.max-content-height {
  height: 60vh;
}

.instances-list-elements {
  overflow-y: auto;
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
