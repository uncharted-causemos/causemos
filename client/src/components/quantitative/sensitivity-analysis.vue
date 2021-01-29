<template>
  <div class="sensitivity-analysis-container">
    <sensitivity-analysis-legend />
    <div class="x-axis-label">
      <h5>IMPACTS / EFFECTS</h5>
      <div class="actions">
        <label>Analysis Type: </label>
        <select
          @change="setAnalysisType">
          <option
            value="GLOBAL"
          >Global</option>
          <option
            value="IMMEDIATE"
          >Immediate</option>
        </select>
        <label>Sort by: </label>
        <button
          v-tooltip="'Concepts in model with the highest total influence will be the top rows.'"
          class="btn btn-default"
          @click="sortByInfluential"
        >
          Most Influential
        </button>
        <button
          v-tooltip="'Concepts in model that are most influenced by others will be the leftmost columns.'"
          class="btn btn-default"
          @click="sortByImpacted"
        >
          Most Impacted
        </button>
      </div>
    </div>
    <div class="y-axis-label">
      <h5>DRIVERS / CAUSES</h5>
    </div>
    <div class="matrix-container">
      <resize-observer
        ref="resizeObserver"
        @notify="handleResize"
      />
      <svg
        ref="matrix-container"
      />
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import * as d3 from 'd3';
import renderSensitivityMatrix from '@/charts/matrix-renderer';
import modelService from '@/services/model-service';
import { mapGetters, mapActions } from 'vuex';
import { conceptShortName } from '@/utils/concept-util';
import csrUtil from '@/utils/csr-util';
import SensitivityAnalysisLegend from './sensitivity-analysis-legend.vue';

const MAX_TRIES = 40;
const RESIZE_DELAY = 50;

const AXIS_LABEL_MARGIN_PX = 90;

const SORT_ORDER_TYPE = {
  UNSET: null,
  MOST_INFLUENTIAL: 'MOST_INFLUENTIAL',
  MOST_IMPACTED: 'MOST_IMPACTED',
  SELECTED_ROW: 'SELECTED_ROW',
  SELECTED_COLUMN: 'SELECTED_COLUMN'
};

export default {
  name: 'SensitivityAnalysisView',
  components: { SensitivityAnalysisLegend },
  props: {
    modelSummary: {
      type: Object,
      required: true
    },
    scenarios: {
      type: Array,
      required: true
    }
  },
  data: () => ({
    // Declare this method in data instead of in methods so that one debounced function is created
    //  for each instance of line-chart, rather than shared between them statically. This avoids
    //  the situation where multiple line-charts resize simultaneously, but all the calls are ignored
    //  by debounce() except one.
    resize: _.debounce(function (width, height) {
      this.render(width, height);
    }, RESIZE_DELAY),
    matrixData: null,
    analysisType: 'GLOBAL',
    sortOrder: { type: SORT_ORDER_TYPE.UNSET, concept: null }
  }),
  computed: {
    ...mapGetters({
      selectedScenarioId: 'model/selectedScenarioId'
    })
  },
  watch: {
    scenarios() {
      this.refresh();
    },
    selectedScenarioId() {
      this.refresh();
    },
    matrixData() {
      this.render();
    },
    sortOrder() {
      this.render();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay'
    }),
    async refresh() {
      if (this.scenarios.length === 0) return;
      this.enableOverlay('Running sensitivity analysis');
      const constraints = this.scenarios.find(scenario => scenario.id === this.selectedScenarioId).parameter.constraints;
      const experimentId = await modelService.runSensitivityAnalysis(this.modelSummary, this.analysisType, 'DYNAMIC', constraints);
      const results = await modelService.getExperimentResult(this.modelSummary.id, experimentId, MAX_TRIES);
      this.disableOverlay();
      const csrResults = csrUtil.resultsToCsrFormat(results.results[this.analysisType.toLowerCase()]);
      this.matrixData = this.applyShortNameFilter(csrResults);
    },
    applyShortNameFilter(csrResults) {
      csrResults.rows = csrResults.rows.map(conceptShortName);
      csrResults.columns = csrResults.columns.map(conceptShortName);
      return csrResults;
    },
    setAnalysisType(e) {
      this.analysisType = e.target.value;
      this.refresh();
    },
    getAxisOrderings() {
      let rowOrder = null;
      let columnOrder = null;
      if (this.matrixData === null) return { rowOrder, columnOrder };
      switch (this.sortOrder.type) {
        case SORT_ORDER_TYPE.MOST_INFLUENTIAL:
          rowOrder = csrUtil.getSortedOrder(this.matrixData.rows, this.matrixData.value);
          columnOrder = null;
          break;
        case SORT_ORDER_TYPE.MOST_IMPACTED:
          rowOrder = null;
          columnOrder = csrUtil.getSortedOrder(this.matrixData.columns, this.matrixData.value);
          break;
        // TODO: case SORT_ORDER_TYPE.SELECTED_ROW:
        // TODO: case SORT_ORDER_TYPE.SELECTED_COLUMN:
      }
      return { rowOrder, columnOrder };
    },
    render(width, height) {
      const svgWidth = width || this.$refs['matrix-container'].clientWidth;
      const svgHeight = height || this.$refs['matrix-container'].clientHeight;
      const { rowOrder, columnOrder } = this.getAxisOrderings();
      const options = {
        axisLabelMargin: AXIS_LABEL_MARGIN_PX,
        width: svgWidth,
        height: svgHeight,
        rowOrder,
        columnOrder,
        showRankLabels: true
      };

      const refSelection = d3.select(this.$refs['matrix-container']);

      refSelection.selectAll('*').remove();

      renderSensitivityMatrix(
        refSelection,
        options,
        this.matrixData,
        true,
        true
      );
    },
    handleResize({ width, height }) {
      this.resize(width, height);
    },
    sortByInfluential() {
      this.sortOrder = {
        type: SORT_ORDER_TYPE.MOST_INFLUENTIAL,
        concept: null
      };
    },
    sortByImpacted() {
      this.sortOrder = {
        type: SORT_ORDER_TYPE.MOST_IMPACTED,
        concept: null
      };
    }
  }
};
</script>

<style lang="scss" scoped>
  @import "~styles/variables";
  $axisMargin: 90px; // Should equal the AXIS_LABEL_MARGIN_PX in this file

  .sensitivity-analysis-container {
    width: 100%;
    height: 100%;
    display: grid;
    padding: 2rem;
    grid-template-columns: 4rem auto;
    grid-template-rows: 4rem auto;
    grid-template-areas:
      'empty x-axis-label'
      'y-axis-label matrix';
    position: relative;
    overflow: hidden;
  }

  .x-axis-label h5, .y-axis-label h5 {
    position: absolute;
    margin: 0;
  }

  .x-axis-label {
    position: relative;
    grid-area: x-axis-label;
    margin-left: $axisMargin;
    border-bottom: 1px solid #000;

    h5 {
      bottom: 5px;
      left: 0;
    }

    .actions {
      position: absolute;
      bottom: 5px;
      right: 0;

      & > * {
        margin-left: 5px;
      }
    }
  }

  .y-axis-label {
    position: relative;
    grid-area: y-axis-label;
    margin-top: $axisMargin;
    border-right: 1px solid #000;

    h5 {
      bottom: 100%;
      right: 5px;
      transform-origin: bottom right;
      white-space: nowrap;
      transform: rotateZ(-90deg);
    }
  }

  .matrix-container {
    grid-area: matrix;
    position: relative;

    svg {
      width: 100%;
      height: 100%;
    }
  }

  /deep/ .grid-lines path {
    stroke-width: 0;
  }

  /deep/ .grid-lines line {
    stroke-width: 4px;
    stroke: $background-light-2;
  }
</style>
