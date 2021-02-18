<template>
  <div class="sensitivity-analysis-container">
    <sensitivity-analysis-legend />
    <div class="x-axis-label">
      <h5>IMPACTS / EFFECTS</h5>
      <div class="actions">
        <p
          v-if="selectedRowOrColumn.concept !== null"
          class="sort-description"
        >
          {{ selectedRowOrColumn.isRow
            ? 'Columns sorted by most impacted by '
            : 'Rows sorted by most impact on '
          }}
          <span class="concept">{{ selectedRowOrColumn.concept }}</span>
        </p>
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
    matrixData: { rows: [], columns: [], value: [] },
    selectedRowOrColumn: { isRow: false, concept: null },
    analysisType: 'GLOBAL'
  }),
  computed: {
    ...mapGetters({
      selectedScenarioId: 'model/selectedScenarioId'
    }),
    rowOrder() {
      if (this.selectedRowOrColumn.concept === null || this.selectedRowOrColumn.isRow === true) {
        return csrUtil.getSortedOrder(this.matrixData.rows, this.matrixData.value);
      }
      const { isRow, concept } = this.selectedRowOrColumn;
      return csrUtil.getSortedOrderBySelection(this.matrixData, isRow, concept);
    },
    columnOrder() {
      if (this.selectedRowOrColumn.concept === null || this.selectedRowOrColumn.isRow === false) {
        return csrUtil.getSortedOrder(this.matrixData.columns, this.matrixData.value);
      }
      const { isRow, concept } = this.selectedRowOrColumn;
      return csrUtil.getSortedOrderBySelection(this.matrixData, isRow, concept);
    }
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
    rowOrder() {
      this.render();
    },
    columnOrder() {
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
    render(width, height) {
      const svgWidth = width || this.$refs['matrix-container'].clientWidth;
      const svgHeight = height || this.$refs['matrix-container'].clientHeight;
      const options = {
        axisLabelMargin: AXIS_LABEL_MARGIN_PX,
        width: svgWidth,
        height: svgHeight,
        rowOrder: this.rowOrder,
        columnOrder: this.columnOrder,
        showRankLabels: true
      };

      const refSelection = d3.select(this.$refs['matrix-container']);

      refSelection.selectAll('*').remove();

      renderSensitivityMatrix(
        refSelection,
        options,
        this.matrixData,
        true,
        true,
        this.selectedRowOrColumn,
        this.onRowOrColumnClick
      );
    },
    handleResize({ width, height }) {
      this.resize(width, height);
    },
    onRowOrColumnClick(isRow, concept) {
      const newSelectedRowOrColumn = { isRow, concept };
      this.selectedRowOrColumn = _.isEqual(this.selectedRowOrColumn, newSelectedRowOrColumn)
        ? { isRow: false, concept: null } // De-select
        : newSelectedRowOrColumn;
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
      display: flex;
      align-items: center;

      label {
        margin: 0;
      }

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

  /deep/ .tick text {
    cursor: pointer;

    &:hover {
      color: grey;
    }

    &.selected {
      color: $selected-dark;
      &:hover {
        color: $selected;
      }
    }
  }

  .sort-description {
    margin: 0;
    margin-right: 20px;

    .concept {
      color: $selected-dark;
    }
  }
</style>
