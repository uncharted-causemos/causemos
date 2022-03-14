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
      <radio-button-group
        class="nav-item"
        :selected-button-value="comparativeAnalysisViewSelection"
        :buttons="comparativeAnalysisGroupButtons"
        @button-clicked="setComparativeAnalysisView"
      />
    </nav>
  </div>

</template>

<script>

import { mapActions, mapGetters } from 'vuex';
import RadioButtonGroup from '@/components/widgets/radio-button-group.vue';
import { getAnalysis } from '@/services/analysis-service';
import { ComparativeAnalysisMode } from '@/types/Enums';
import { ref } from 'vue';
import filtersUtil from '@/utils/filters-util';
import { STATUS } from '@/utils/datacube-util';

export default {
  name: 'ActionBar',
  components: {
    RadioButtonGroup
  },
  setup() {
    const capitalize = (str) => {
      return str[0].toUpperCase() + str.slice(1);
    };
    const comparativeAnalysisGroupButtons = ref(Object.values(ComparativeAnalysisMode)
      .map(val => ({ label: capitalize(val), value: val })));
    return {
      comparativeAnalysisGroupButtons
    };
  },
  data: () => ({
    analysisName: ''
  }),
  computed: {
    ...mapGetters({
      comparativeAnalysisViewSelection: 'dataAnalysis/comparativeAnalysisViewSelection',
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
  },
  methods: {
    ...mapActions({
      setComparativeAnalysisViewSelection: 'dataAnalysis/setComparativeAnalysisViewSelection'
    }),
    openDataExplorer() {
      const filters = filtersUtil.newFilters();
      filtersUtil.setClause(filters, STATUS, ['READY'], 'or', false);
      this.$router.push({ name: 'dataExplorer', query: { analysisId: this.analysisId, filters } });
    },
    setComparativeAnalysisView(viewSelection) {
      this.setComparativeAnalysisViewSelection(viewSelection);
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
}

</style>
