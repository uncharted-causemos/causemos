<template>
  <div>
    <nav class="action-bar-container">

      <!-- Actions -->
      <div class="nav-item">
        <button
          v-tooltip.top-center="'Search Data Cubes'"
          type="button"
          class="btn btn-primary btn-call-for-action"
          @click="openDataExplorer"
        > <i class="fa fa-fw fa-search" />Search Data Cubes</button>
      </div>
      <div
        class="nav-item time-sync"
        :class="{ 'disabled': emptyDataAnalysis }"
      >
        <label @click="setTimeSelectionSyncing(!timeSelectionSyncing)">
          <i
            class="fa fa-lg fa-fw"
            :class="{ 'fa-check-square-o': timeSelectionSyncing, 'fa-square-o': !timeSelectionSyncing }"
          />
          Sync time selection
        </label>
      </div>
    </nav>
  </div>

</template>

<script>

import { mapActions, mapGetters } from 'vuex';

import { getAnalysis } from '@/services/analysis-service';

export default {
  name: 'ActionBar',
  data: () => ({
    showDropdown: false,
    showRenameModal: false,
    analysisName: ''
  }),
  computed: {
    ...mapGetters({
      timeSelectionSyncing: 'dataAnalysis/timeSelectionSyncing',
      analysisId: 'dataAnalysis/analysisId',
      analysisItems: 'dataAnalysis/analysisItems',
      project: 'app/project'
    }),
    emptyDataAnalysis() {
      return this.analysisItems.length === 0;
    }
  },
  async mounted() {
    const result = await getAnalysis(this.analysisId);
    this.analysisName = result.title;
    // if no data cube unset time syncing
    if (this.emptyDataAnalysis) {
      this.setTimeSelectionSyncing(false);
    }
  },
  methods: {
    ...mapActions({
      setTimeSelectionSyncing: 'dataAnalysis/setTimeSelectionSyncing'
    }),
    openDataExplorer() {
      this.$router.push({ name: 'dataExplorer', query: { analysisName: this.analysisName } });
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.action-bar-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  position: relative;

  .nav-item:not(:first-child) {
    margin-left: 20px;
  }
  button {
    i {
      margin-right: 5px;
    }
  }

  .time-sync {
    label {
      font-weight: normal;
      cursor: pointer;
      margin: 0;
    }
  }
}

</style>
