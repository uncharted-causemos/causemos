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
          <small-icon-button @click="updateDesc" v-tooltip.top-center="'Edit description'">
            <i class="fa fa-edit" />
          </small-icon-button>
        </div>
        <a :href="maintainerWebsite" target="_blank" rel="noopener noreferrer" style="color: blue">
          {{ maintainerWebsite }}
        </a>
        <div>
          <strong>Maintainer</strong>
          <span class="maintainer">{{ projectSource }}</span>
        </div>
      </div>
    </header>
    <main class="instance-list-column">
      <div class="instance-list-header">
        <div class="column-title">
          Instances
          <button class="btn btn-call-to-action" disabled>
            <i class="fa fa-plus-circle" />
            Register New
          </button>
        </div>
        <div class="controls">
          <div class="filter-options">
            <label
              v-for="filter of filterOptions"
              :key="filter.status"
              class="filter-label"
              @click="filter.selected = !filter.selected"
            >
              <i
                class="fa fa-lg fa-fw"
                :class="{ 'fa-check-square-o': filter.selected, 'fa-square-o': !filter.selected }"
              />
              {{ getDatacubeStatusInfo(filter.status).label }}
            </label>
          </div>
          <input
            v-model="searchDatacubeInstances"
            type="text"
            placeholder="Search ..."
            class="form-control"
          />
          <div class="sorting">
            <div>
              <button type="button" class="btn" @click="toggleSortingDropdownDatacubeInstances">
                <span class="lbl">Sort by</span> - {{ selectedSortingOptionDatacubeInstances }}
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
                    @click="sortDatacubeInstances(option)"
                  >
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
          @update-domains="updateDatacubeDomains"
        />
        <message-display
          v-if="filteredDatacubeInstances.length === 0"
          :message-type="'alert-warning'"
          :message="'No model instances'"
        />
      </div>
    </main>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import DomainDatacubeInstanceCard from '@/components/domain-datacube-instance-card.vue';
import filtersUtil from '@/utils/filters-util';
import { getDatacubes } from '@/services/datacube-service';
import _ from 'lodash';
import domainProjectService from '@/services/domain-project-service';
import DropdownControl from '@/components/dropdown-control.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';
import SmallIconButton from '@/components/widgets/small-icon-button.vue';
import { unpublishDatacubeInstance, getDatacubeStatusInfo } from '@/utils/datacube-util';
import { sortItem, modifiedAtSorter, nameSorter, SortOptions } from '@/utils/sort/sort-items';

import { DatacubeStatus } from '@/types/Enums';

export default {
  name: 'DomainProjectOverview',
  components: {
    DomainDatacubeInstanceCard,
    DropdownControl,
    MessageDisplay,
    SmallIconButton,
  },
  data: () => ({
    datacubeInstances: [],
    searchDatacubeInstances: '',
    showSortingDropdownDatacubeInstances: false,
    sortingOptionsDatacubeInstances: Object.values(SortOptions),
    selectedSortingOptionDatacubeInstances: SortOptions.MostRecent,
    isEditingDesc: false,
    filterOptions: [
      { status: DatacubeStatus.Ready, selected: true },
      { status: DatacubeStatus.Registered, selected: true },
      { status: DatacubeStatus.Deprecated, selected: false },
    ],
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      projectMetadata: 'app/projectMetadata',
    }),
    filteredDatacubeInstances() {
      return this.datacubeInstances
        .filter(
          (instance) =>
            this.filterOptions.find((filter) => filter.status === instance.status)?.selected ?? true
        )
        .filter((instance) =>
          instance.name.toLowerCase().includes(this.searchDatacubeInstances.toLowerCase())
        );
    },
    tags() {
      if (!this.datacubeInstances || this.datacubeInstances.length === 0) {
        return [];
      }
      return this.datacubeInstances.map((d) => d.tags).flat();
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
    },
  },
  watch: {
    projectMetadata: function () {
      this.fetchDatacubeInstances();
    },
  },
  async mounted() {
    this.fetchDatacubeInstances();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      setContextId: 'insightPanel/setContextId',
    }),
    getDatacubeStatusInfo,
    updateDesc() {
      if (this.isEditingDesc) {
        // we may have just modified the desc text, so update the server value
        domainProjectService.updateDomainProject(this.project, {
          description: this.projectMetadata.description,
        });
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
        const contextIDs = this.datacubeInstances.map((dc) => dc.id);
        this.setContextId(contextIDs);
      } else {
        // no datacubes were found, do not fetch any insights/questions
        this.setContextId(undefined);
      }

      // Sort by modified_at date with latest on top
      this.sortDatacubeInstancesByMostRecentDate();

      this.disableOverlay();
    },
    unpublishInstance(instance) {
      unpublishDatacubeInstance(instance);
    },
    updateDatacubeDomains(id, domains) {
      const datacube = this.datacubeInstances.find((d) => d.id === id);
      if (datacube) {
        datacube.domains = domains;
      }
    },
    toggleSortingDropdownDatacubeInstances() {
      this.showSortingDropdownDatacubeInstances = !this.showSortingDropdownDatacubeInstances;
    },
    sortDatacubeInstancesByMostRecentDate() {
      this.datacubeInstances.sort((a, b) => {
        return a.modified_at && b.modified_at ? b.modified_at - a.modified_at : 0;
      });
    },

    sortDatacubeInstances(option) {
      this.selectedSortingOptionDatacubeInstances = option;
      this.showSortingDropdownDatacubeInstances = false;
      this.datacubeInstances = sortItem(
        this.datacubeInstances,
        { date: modifiedAtSorter, name: nameSorter },
        this.selectedSortingOptionDatacubeInstances
      );
    },
  },
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

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
    text-align: justify;
  }
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

.instance-list-column {
  flex: 3;
  display: flex;
  flex-direction: column;
  padding: 20px;
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

.filter-options {
  display: flex;
  margin-top: 10px;

  .filter-label {
    margin: 0px;
    padding-left: 0px;
    padding-right: 10px;
    font-weight: unset;
    cursor: pointer;
    color: black;
  }
}

.controls {
  display: flex;
  justify-content: space-between;
  input[type='text'] {
    padding: 8px;
    width: 150px;
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
        position: absolute;
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
