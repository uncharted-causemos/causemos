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
      @click="addToAnalysis"
    >
      <i class="fa fa-fw fa-plus-circle" />
      Add to Analysis
    </button>
    <span>
      <span class="selected">{{ selectedDatacubes.length }} selected</span>
      of {{ searchResultsCount }} data cubes (select up to 6)
    </span>
  </full-screen-modal-header>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import FullScreenModalHeader from '../widgets/full-screen-modal-header';

export default {
  name: 'DataExplorerModalHeader',
  components: {
    FullScreenModalHeader
  },
  props: {
    navBackLabel: {
      type: String,
      default: ''
    }
  },
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
      this.onClose();
    },
    onClose() {
      this.$emit('close');
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
