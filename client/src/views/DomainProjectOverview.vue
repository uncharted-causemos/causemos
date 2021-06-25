<template>
  <div class="project-overview-container">
    <div class="logo-container">
      <img
        class="logo"
        src="../assets/causemos-logo-colour.svg"
        alt="CauseMos logo"
      >
    </div>
    <h3 class="header-prompt">Welcome to the domain {{datacubeType}} family page of <b>{{datacubeFamily}}</b></h3>
    <div class="row title">
      <div class="descriptions">
        Through this page, you can publish {{datacubeType}} instances and track insights.
      </div>
    </div>
    <div class="row">
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
    <div class="row projects-list">
      <div class="row projects-list-header">
        <div class="col-sm-4">
          Name
        </div>
        <div class="col-sm-4">
          # Source
        </div>
        <div class="col-sm-2">
          # Status
        </div>
        <div class="col-sm-2">
          Created At
        </div>
      </div>
      <div class="instances-list-elements">
        <div
          v-for="instance in filteredDatacubeInstances"
          :key="instance.id">
          <domain-datacube-instance-card
            :model="instance"
            @unpublish="unpublishDatacubeInstance(instance)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import DomainDatacubeInstanceCard from '@/components/domain-datacube-instance-card.vue';
import projectService from '@/services/domain-project-service';
import filtersUtil from '@/utils/filters-util';
import { getDatacubes, updateDatacube } from '@/services/new-datacube-service';
import { DatacubeStatus } from '@/types/Enums';

export default {
  name: 'DomainProjectOverview',
  components: {
    DomainDatacubeInstanceCard
  },
  data: () => ({
    datacubeFamily: '',
    datacubeType: '',
    datacubeInstances: [],
    searchDatacubeInstances: '',
    showSortingDropdownDatacubeInstances: false,
    sortingOptionsDatacubeInstances: ['Most recent', 'Earliest'],
    selectedSortingOptionDatacubeInstances: 'Most recent'
  }),
  computed: {
    ...mapGetters({
      project: 'app/project'
    }),
    filteredDatacubeInstances() {
      return this.datacubeInstances.filter(instance => {
        return instance.name.toLowerCase().includes(this.searchDatacubeInstances.toLowerCase());
      });
    }
  },
  async mounted() {
    // first: fetch project info
    const projectInfo = await projectService.getProject(this.project);
    this.datacubeFamily = projectInfo.name;
    this.datacubeType = projectInfo.type;

    // then, fetch model instances
    const newFilters = filtersUtil.newFilters();
    // filtersUtil.addSearchTerm(newFilters, 'name', this.datacubeFamily, 'and', false);
    // filtersUtil.addSearchTerm(newFilters, 'type', 'model', 'and', false);
    const instances = await getDatacubes(newFilters);
    // FIXME: manaully allow overalapping models
    //  (e.g., old dssat and new dssat to be listed under the family name of dssat)
    this.datacubeInstances = instances.filter(i => i.name.includes(this.datacubeFamily));

    // Sort by modified_at date with latest on top
    this.sortDatacubeInstancesByMostRecentDate();
  },
  methods: {
    ...mapActions({
      setProjectMetadata: 'app/setProjectMetadata',
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay'
    }),
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

$padding-size: 12.5vh;
.project-overview-container {
  padding: $padding-size;
  padding-top: 0;
}

.logo-container {
  width: 100%;
  margin-top: calc(#{$padding-size / 2} - 10px);
  height: $padding-size;
  text-align: center;
}

.logo {
  height: 100%;
  position: relative;
  // Nudge the logo left a little to look more visually centered
  left: - $padding-size / 6;
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
</style>
