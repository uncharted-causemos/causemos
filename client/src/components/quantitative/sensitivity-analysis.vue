<template>
  <div class="sensitivity-analysis-container">
    <div v-if="statusMessage">
      {{ statusMessage }}
    </div>
    <sensitivity-analysis-legend />
    <div class="x-axis-label">
      <h5>IMPACTS / EFFECTS</h5>
      <div class="actions">
        <p v-if="selectedRowOrColumn.concept !== null" class="sort-description">
          {{
            selectedRowOrColumn.isRow
              ? 'Columns sorted by most impacted by '
              : 'Rows sorted by most impact on '
          }}
          <span class="concept">{{ selectedRowOrColumn.concept }}</span>
        </p>
        <!--
        <label>Analysis Type: </label>
        <select
          :value="analysisType"
          @change="setAnalysisType">
          <option
            value="GLOBAL"
          >Global</option>
          <option
            value="IMMEDIATE"
          >Immediate</option>
        </select>
        -->
      </div>
    </div>
    <div class="y-axis-label">
      <h5>DRIVERS / CAUSES</h5>
    </div>
    <div class="matrix-container">
      <resize-observer ref="resizeObserver" @notify="handleResize" />
      <svg ref="matrix-container" :class="{ faded: matrixData === null }"></svg>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import * as d3 from 'd3';
import { mapActions, mapGetters } from 'vuex';
import renderSensitivityMatrix from '@/charts/matrix-renderer';
import csrUtil from '@/utils/csr-util';
import { showSvgTooltip, hideSvgTooltip } from '@/utils/svg-util';
import ordinalNumberFormatter from '@/formatters/ordinal-number-formatter';
import modelService from '@/services/model-service';
import SensitivityAnalysisLegend from './sensitivity-analysis-legend.vue';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';

const RESIZE_DELAY = 50;

const AXIS_LABEL_MARGIN_PX = 90;

const CELL_WIDTH_PX = 60;
const CELL_HEIGHT_PX = 30;

export default {
  name: 'SensitivityAnalysisView',
  components: { SensitivityAnalysisLegend },
  props: {
    modelSummary: {
      type: Object,
      required: true,
    },
    sensitivityResult: {
      type: Object,
      default: null,
    },
    analysisType: {
      // Deprecated
      type: String,
      default: 'GLOBAL',
    },
  },
  setup() {
    const ontologyFormatter = useOntologyFormatter();
    return {
      ontologyFormatter,
    };
  },
  data: () => ({
    // Declare this method in data instead of in methods so that one debounced function is created
    //  for each instance of line-chart, rather than shared between them statically. This avoids
    //  the situation where multiple line-charts resize simultaneously, but all the calls are ignored
    //  by debounce() except one.
    resize: _.debounce(function (width, height) {
      this.render(width, height);
    }, RESIZE_DELAY),
    selectedRowOrColumn: { isRow: false, concept: null },
    matrixData: null,
    statusMessage: null,
  }),
  computed: {
    ...mapGetters({
      tour: 'tour/tour',
      currentCAG: 'app/currentCAG',
    }),
    rowOrder() {
      if (this.matrixData === null) return [];
      if (this.selectedRowOrColumn.concept === null || this.selectedRowOrColumn.isRow === true) {
        return csrUtil.getSortedOrder(this.matrixData.rows, this.matrixData.value);
      }
      const { isRow, concept } = this.selectedRowOrColumn;
      return csrUtil.getSortedOrderBySelection(this.matrixData, isRow, concept);
    },
    columnOrder() {
      if (this.matrixData === null) return [];
      if (this.selectedRowOrColumn.concept === null || this.selectedRowOrColumn.isRow === false) {
        return csrUtil.getSortedOrder(this.matrixData.columns, this.matrixData.value);
      }
      const { isRow, concept } = this.selectedRowOrColumn;
      return csrUtil.getSortedOrderBySelection(this.matrixData, isRow, concept);
    },
    tooltipTexts() {
      if (this.matrixData === null) return null;
      const cleanData = this.matrixData.value.map((value, i) => {
        return {
          row: this.matrixData.rows[i],
          column: this.matrixData.columns[i],
          value,
        };
      });
      const rankedValues = cleanData.map((d) => d.value).sort(d3.descending);
      return cleanData.reduce((a, v) => {
        if (a[v.row] === undefined) a[v.row] = {};
        const cellRank = rankedValues.findIndex((rankedValue) => rankedValue === v.value) + 1;
        a[v.row][v.column] = `${v.row}'s impact on ${v.column}\nis the ${ordinalNumberFormatter(
          cellRank
        )} most impactful on the model.`;
        return a;
      }, {});
    },
  },
  watch: {
    sensitivityResult() {
      this.refresh();
      // allow the relevant tour to advance to the next step
      if (this.tour && this.tour.id.startsWith('sensitivity-matrix-tour')) {
        this.enableNextStep();
      }
    },
    rowOrder() {
      this.render();
    },
    columnOrder() {
      this.render();
    },
  },
  mounted() {
    this.refresh();
  },
  beforeUnmount() {
    // a tour may be active while we are in this view,
    //  if so and the user interaction is no longer within this view then cancel the tour
    if (this.tour && this.tour.id.startsWith('sensitivity-matrix-tour')) {
      this.tour.cancel();
    }
  },
  methods: {
    ...mapActions({
      enableNextStep: 'tour/enableNextStep',
    }),
    setAnalysisType(e) {
      this.$emit('set-analysis-type', e.target.value);
    },
    async poll() {
      const r = await modelService.getExperimentResultOnce(
        this.currentCAG,
        'dyse',
        this.sensitivityResult.experiment_id
      );
      if (r.status === 'completed' && r.results) {
        this.processSensitivityResult(r);
      } else {
        this.updatePollingProgress(r);
      }
    },
    updatePollingProgress(result) {
      console.log('update polling progress', result);
      const progressMessage = result.progressPercentage
        ? ` - ${(result.progressPercentage * 100, 2).toFixed(2)}% Complete`
        : '';
      this.statusMessage = `Sensitivity Analysis In Progress${progressMessage}`;
      window.setTimeout(() => {
        this.poll();
      }, 5000);
    },
    async processSensitivityResult(result) {
      console.log('process sensitivity result', result);
      this.statusMessage = null;

      await modelService.updateScenarioSensitivityResult(
        this.sensitivityResult.id,
        this.sensitivityResult.experiment_id,
        result
      );
      const csrResults = csrUtil.resultsToCsrFormat(result.results.global);
      csrResults.rows = csrResults.rows.map(this.ontologyFormatter);
      csrResults.columns = csrResults.columns.map(this.ontologyFormatter);
      this.matrixData = csrResults;
      this.render();
    },
    async refresh() {
      if (this.sensitivityResult === null) return;

      if (!this.sensitivityResult.result || this.sensitivityResult.is_valid === false) {
        this.poll();
      } else {
        console.log('use cache!!!');
        const csrResults = csrUtil.resultsToCsrFormat(this.sensitivityResult.result.results.global);
        csrResults.rows = csrResults.rows.map(this.ontologyFormatter);
        csrResults.columns = csrResults.columns.map(this.ontologyFormatter);
        this.matrixData = csrResults;
        this.render();
      }
    },
    render() {
      if (this.matrixData === null) return;

      const refSelection = d3.select(this.$refs['matrix-container']);
      const svgWidth =
        _.uniq(this.matrixData.columns).length * CELL_WIDTH_PX + AXIS_LABEL_MARGIN_PX;
      const svgHeight = _.uniq(this.matrixData.rows).length * CELL_HEIGHT_PX + AXIS_LABEL_MARGIN_PX;

      refSelection.attr('height', svgHeight).attr('width', svgWidth);

      const options = {
        axisLabelMargin: AXIS_LABEL_MARGIN_PX,
        width: svgWidth,
        height: svgHeight,
        rowOrder: this.rowOrder,
        columnOrder: this.columnOrder,
        showRankLabels: true,
      };
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
      refSelection.on('mousemove', (evt) => {
        if (evt.layerX > AXIS_LABEL_MARGIN_PX && evt.layerY > AXIS_LABEL_MARGIN_PX) {
          const tooltipText = this.getTooltipText(evt.layerX, evt.layerY, svgWidth, svgHeight);
          if (tooltipText !== null) {
            showSvgTooltip(refSelection, tooltipText, [evt.layerX, evt.layerY], Math.PI, true);
          } else {
            hideSvgTooltip(refSelection);
          }
        } else {
          hideSvgTooltip(refSelection);
        }
      });
      refSelection.on('mouseleave', () => {
        hideSvgTooltip(refSelection);
      });
    },
    handleResize({ width, height }) {
      this.resize(width, height);
    },
    onRowOrColumnClick(isRow, concept) {
      const newSelectedRowOrColumn = { isRow, concept };
      this.selectedRowOrColumn = _.isEqual(this.selectedRowOrColumn, newSelectedRowOrColumn)
        ? { isRow: false, concept: null } // De-select
        : newSelectedRowOrColumn;
    },
    getTooltipText(x, y, svgWidth, svgHeight) {
      if (this.tooltipTexts === null) return null;
      const rowSize = (svgHeight - AXIS_LABEL_MARGIN_PX) / this.rowOrder.length;
      const columnSize = (svgWidth - AXIS_LABEL_MARGIN_PX) / this.columnOrder.length;
      const rowIndex = Math.ceil((y - AXIS_LABEL_MARGIN_PX) / rowSize) - 1;
      const columnIndex = Math.ceil((x - AXIS_LABEL_MARGIN_PX) / columnSize) - 1;
      const rowName = rowIndex > -1 ? this.rowOrder[rowIndex] : null;
      const columnName = columnIndex > -1 ? this.columnOrder[columnIndex] : null;
      const tooltipText = this.tooltipTexts[rowName][columnName];

      return tooltipText || null;
    },
  },
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';
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
  background-color: rgb(242, 242, 242);
}

.x-axis-label h5,
.y-axis-label h5 {
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
  overflow: scroll;

  svg {
    transition: opacity 0.3s ease-out;

    &.faded {
      opacity: 0.5;
      transition: opacity 1s ease;
    }
  }
}

:deep(.grid-lines path) {
  stroke-width: 0;
}

:deep(.grid-lines line) {
  stroke-width: 4px;
  stroke: $background-light-2;
}

:deep(.tick text) {
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
