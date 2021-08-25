<template>
  <div class="parallel-coordinates-container">
    <span class="scenario-count">
      {{scenarioCount}} scenario{{scenarioCount != 1 ? 's' : ''}}.
    </span>
    <div class="chart-wrapper">
      <svg
        ref="pcsvg"
        :class="{'faded': dimensionsData === null}"
      />
      <resize-observer @notify="resize" />
      <span
        v-if="dimensionsData === null"
        class="loading-message"
      >
        <i class="fa fa-spin fa-spinner" /> Loading ...
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3';
import _ from 'lodash';
import { renderParallelCoordinates } from '@/charts/parallel-coordinates';
import { computed, defineComponent, PropType, toRefs } from 'vue';
import { ScenarioData } from '@/types/Common';
import { DimensionInfo } from '@/types/Datacube';
import { ParallelCoordinatesOptions } from '@/types/ParallelCoordinates';

const RESIZE_DELAY = 50;

export default defineComponent({
  name: 'ParallelCoordinatesChart',
  props: {
    dimensionsData: {
      type: Array as PropType<ScenarioData[]>,
      default: null
    },
    selectedDimensions: {
      type: Array as PropType<DimensionInfo[]>,
      default: null
    },
    ordinalDimensions: {
      type: Array as PropType<string[]>,
      default: null
    },
    initialDataSelection: {
      type: Array as PropType<string[]>,
      default: undefined
    },
    newRunsMode: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'select-scenario',
    'generated-scenarios'
  ],
  setup(props) {
    const { dimensionsData } = toRefs(props);
    return {
      scenarioCount: computed(() => dimensionsData.value.length)
    };
  },
  data: () => ({
    lastSelectedLines: [] as Array<string>
  }),
  watch: {
    dimensionsData(): void {
      this.render(undefined);
    },
    selectedDimensions(): void {
      this.render(undefined);
    },
    newRunsMode(): void {
      this.render(undefined);
    },
    initialDataSelection(): void {
      if (!this.newRunsMode) {
        // do not make initial line selection override existing user selections
        if (this.lastSelectedLines.length === 0 || this.initialDataSelection.length === 0 ||
            !_.isEqual(this.lastSelectedLines, this.initialDataSelection)) {
          this.lastSelectedLines.length = 0;
          this.render(undefined);
        }
      }
    }
  },
  mounted(): void {
    this.render(undefined);
  },
  methods: {
    resizeDebounced: _.debounce(function(this: any, width, height) {
      this.render({ width, height });
    }, RESIZE_DELAY),
    resize(size: {width: number; height: number}) {
      this.resizeDebounced.bind(this)(size.width, size.height);
    },
    render(size: {width: number; height: number} | undefined): void {
      let width = 0;
      let height = 0;
      if (size === undefined) {
        // Try to get the size from the parent element
        const parent = (this.$refs.pcsvg as HTMLElement | undefined)?.parentElement;
        if (parent === undefined || parent === null) return;
        const { clientWidth, clientHeight } = parent;
        width = clientWidth;
        height = clientHeight;
      } else {
        width = size.width;
        height = size.height;
      }
      if (this.selectedDimensions === null || this.selectedDimensions.length === 0) return;
      const options: ParallelCoordinatesOptions = {
        width,
        height,
        initialDataSelection: this.initialDataSelection,
        newRunsMode: this.newRunsMode
      };
      const refSelection = d3.select((this.$refs as any).pcsvg);

      const rerenderChart = () => {
        refSelection.selectAll('*').remove();
        renderParallelCoordinates(
          refSelection,
          options,
          this.dimensionsData,
          this.selectedDimensions,
          this.ordinalDimensions,
          this.onLinesSelection,
          this.onGeneratedRuns,
          rerenderChart
        );
      };

      rerenderChart();
    },
    onLinesSelection(selectedLines?: Array<ScenarioData> /* array of selected lines on the PCs plot */): void {
      if (selectedLines && Array.isArray(selectedLines)) {
        this.lastSelectedLines = selectedLines.map(s => s.run_id) as string[];
        this.$emit('select-scenario', { scenarios: selectedLines });
      }
    },
    onGeneratedRuns(generatedLines?: Array<ScenarioData> /* array of generated lines on the PCs plot */): void {
      if (generatedLines && Array.isArray(generatedLines)) {
        //
        // ensure that any choice label is mapped back to its underlying value
        this.selectedDimensions.forEach(d => {
          if (d.choices_labels && d.choices !== undefined) {
            // update all generatedLines accordingly
            generatedLines.forEach(gl => {
              const currLabelValue = (gl[d.name]).toString();
              const labelIndex = d.choices_labels?.findIndex(l => l === currLabelValue) ?? 0;
              if (d.choices !== undefined) {
                gl[d.name] = d.choices[labelIndex];
              }
            });
          }
        });

        this.$emit('generated-scenarios', { scenarios: generatedLines });
      }
    }
  }
});
</script>

<style lang="scss" scoped>
  @import "~styles/variables";

  .parallel-coordinates-container {
    display: flex;
    flex-direction: column;
  }

  .scenario-count {
    color: $label-color;
  }

  .chart-wrapper {
    position: relative;
    flex: 1;
    min-height: 0;

    svg {
      transition: opacity 0.3s ease-out;

      &.faded {
        opacity: 0.5;
        transition: opacity 1s ease;
      }

      ::v-deep(.axis .overlay) {
        &:hover {
          fill-opacity: .3;
          fill: rgb(172, 233, 233);
          shape-rendering: crispEdges;
        }
      }

      ::v-deep(.axis .pc-brush .selection) {
        fill-opacity: .5;
        fill: $selected;
        stroke: none;
        shape-rendering: crispEdges;
      }

      ::v-deep(.axis .pc-brush .handle) {
        fill: #f8f8f8;
        stroke: #888;
        rx: 4;
        ry: 4;
      }

      ::v-deep(.axis text) {

        &.selected {
          color: $selected-dark;
          &:hover {
            color: $selected;
          }
        }
      }
    }
  }

  .loading-message {
    font-size: 28px;
    color: black;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
</style>
