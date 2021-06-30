<template>
  <full-screen-modal-header
    icon="angle-left"
    :nav-back-label="navBackLabel"
    @close="onClose"
  >
    <button
      v-tooltip.top-center="'Add to analysis'"
      type="button"
      class="btn btn-primary btn-call-for-action"
      :disabled="selectedDatacubes.length < 1"
      @click="updateAnalysis"
    >
      <i class="fa fa-fw fa-plus-circle" />
      Add to Analysis
    </button>
    <span>
      <span class="selected">{{ selectedDatacubes.length }} selected</span>
      of {{ searchResultsCount }} data cubes (select 1)
    </span>
  </full-screen-modal-header>
</template>

<script>
import { mapGetters } from 'vuex';

import { deleteAnalysis } from '@/services/analysis-service';
import { ANALYSIS } from '@/utils/messages-util';

import FullScreenModalHeader from '../widgets/full-screen-modal-header';
import { ProjectType } from '@/types/Enums';

export default {
  name: 'DataExplorerModalHeader',
  components: {
    FullScreenModalHeader
  },
  props: {
    navBackLabel: {
      type: String,
      default: ''
    },
    showNamingModal: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'update-analysis'],
  computed: {
    ...mapGetters({
      analysisId: 'dataAnalysis/analysisId',
      project: 'app/project',
      selectedDatacubes: 'dataSearch/selectedDatacubes',
      searchResultsCount: 'dataSearch/searchResultsCount'
    })
  },
  methods: {
    updateAnalysis() {
      this.$emit('update-analysis');
    },

    async onClose() {
      this.clear();
      await new Promise((resolve) => {
        setTimeout(() => { resolve(); }, 500);
      });
      this.$router.push({
        name: 'dataStart',
        params: {
          project: this.project,
          projectType: ProjectType.Analysis
        }
      });
      this.$emit('close');
    },

    async clear() {
      try {
        await deleteAnalysis(this.analysisId);
        this.toaster(ANALYSIS.SUCCESSFUL_DELETION_UNINITIALIZED, 'success', false);
      } catch (e) {
        this.toaster(ANALYSIS.ERRONEOUS_DELETION_UNINITIALIZED, 'error', true);
      }
    }
  }
};
</script>

<style lang="scss" scoped>

.selected {
  font-weight: bold;
  margin-left: 5px;
}

</style>
