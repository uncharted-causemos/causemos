<template>
  <nav class="navbar navbar-default">
    <ul class="nav navbar-nav">
      <li class="nav-item">
        <a
          class="nav-link"
          @click="cancel()">
          <i class="fa fa-fw fa-times" />
        </a>
      </li>
      <li class="nav-item">
        <a><i class="fa fa-fw fa-search" />Search Data Cubes</a>
      </li>
    </ul>

    <div class="add-to-analysis-container">
      <div><button
        v-tooltip.top-center="'Add to analysis'"
        type="button"
        class="btn btn-primary btn-call-for-action"
        @click="addToAnalysis"
      >
        <i class="fa fa-fw fa-plus-circle" />
        Add to Analysis
      </button>
      </div>
      <div class="select-text"><span class="selected">{{ selectedDatacubes.length }} selected</span> &nbsp; / {{ searchResultsCount }} data cubes (select up to 6)</div>
    </div>

  </nav>
</template>

<script>

import { mapGetters, mapActions } from 'vuex';

export default {
  name: 'ActionBar',
  data: () => ({
    count: 0
  }),
  computed: {
    ...mapGetters({
      selectedDatacubes: 'dataSearch/selectedDatacubes',
      searchResultsCount: 'dataSearch/searchResultsCount'
    })
  },
  methods: {
    ...mapActions({
      updateAnalysisItems: 'dataAnalysis/updateAnalysisItems'
    }),
    async addToAnalysis() {
      await this.updateAnalysisItems(this.selectedDatacubes);
      this.$emit('cancel');
    },
    cancel() {
      this.$emit('cancel');
    }
  }
};
</script>


<style lang="scss" scoped>
@import '~styles/variables';
@import '~styles/wm-theme/custom-variables';

.nav>li>a:focus, .nav>li>a:hover {
  background-color: transparent !important;
  cursor: pointer;
}
.navbar-default {
  background-color: #0e3480;
  display: flex;
  align-items: center;
  .nav-item>a {
    color: #ffffff;
    i {
      color: #ffffff;
    }
  }

  .add-to-analysis-container {
    display: flex;
    color: #ffffff;
    flex-grow: 1;
    padding-left: 30px;
    div {
        display: flex;
        align-items: center;
    }
    .select-text {
      padding-left: 25px;
    }
    .selected {
      font-weight: bold;
      margin-left: 10px;
    }

  }

}

</style>
