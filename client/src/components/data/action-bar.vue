<template>
  <div>
    <nav class="action-bar-container">
      <!-- Actions -->
      <div class="nav-item">
        <button
          v-tooltip.top-center="'Search Data Cubes'"
          type="button"
          class="btn btn-call-to-action"
          @click="openDataExplorer"
        >
          <i class="fa fa-fw fa-search" />Search Data Cubes
        </button>
      </div>
      <radio-button-group
        class="nav-item"
        :selected-button-value="activeTab"
        :buttons="tabs"
        @button-clicked="setActiveTab"
      />
    </nav>
  </div>
</template>

<script lang="ts">

import { mapGetters } from 'vuex';
import RadioButtonGroup from '@/components/widgets/radio-button-group.vue';
import { getAnalysis } from '@/services/analysis-service';
import { ComparativeAnalysisMode } from '@/types/Enums';
import filtersUtil from '@/utils/filters-util';
import { STATUS } from '@/utils/datacube-util';
import { capitalize } from '@/utils/string-util';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ActionBar',
  components: {
    RadioButtonGroup
  },
  props: {
    activeTab: {
      type: String,
      required: true
    },
    analysisId: {
      type: String,
      required: true
    }
  },
  setup() {
    return {
      tabs: Object
        .values(ComparativeAnalysisMode)
        .map(val => ({ label: capitalize(val), value: val }))
    };
  },
  data: () => ({
    analysisName: ''
  }),
  computed: {
    ...mapGetters({
      project: 'app/project'
    })
  },
  async mounted() {
    const result = await getAnalysis(this.analysisId);
    if (result) {
      this.analysisName = result.title;
    }
  },
  methods: {
    openDataExplorer() {
      const filters = filtersUtil.newFilters();
      filtersUtil.setClause(filters, STATUS, ['READY'], 'or', false);
      this.$router.push({ name: 'dataExplorer', query: { analysisId: this.analysisId, filters: filters as any } });
    },
    setActiveTab(newActiveTab: string) {
      this.$emit('set-active-tab', newActiveTab);
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

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
