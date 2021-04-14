<template>
  <div
    ref="pcChart"
    class="parallel-coordinates-container"
  >
    <resize-observer
      @notify="resize"
    />
    <svg
      ref="pcsvg"
      :class="{'faded': dimensionsData === null}"
    />
    <span
      v-if="dimensionsData === null"
      class="loading-message"
    >
      <i class="fa fa-spin fa-spinner" /> Loading ...
    </span>
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3';
import _ from 'lodash';
import renderParallelCoordinates from '@/charts/parallel-coordinates';
import { defineComponent, PropType } from 'vue';
import { DimensionData, ScenarioData } from '@/types/Datacubes';
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
      type: Array as PropType<DimensionData[]>,
      default: null
    },
    ordinalDimensions: {
      type: Array as PropType<string[]>,
      default: null
    },
    showBaselineDefaults: {
      type: Boolean,
      default: false
    },
    applyDefaultSelection: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'select-scenario'
  ],
  data: () => {
    return {
      resize: _.debounce(({ width, height }) => {
        // this.render(width, height);
      }, RESIZE_DELAY),
      initialWidth: 0,
      initialHeight: 0
    };
  },
  watch: {
    dimensionsData(): void {
      this.render();
    },
    showBaselineDefaults(): void {
      this.render();
    }
  },
  mounted(): void {
    // set initial width/height
    this.initialWidth = (this.$refs as any).pcChart.clientWidth;
    this.initialHeight = (this.$refs as any).pcChart.clientHeight;
    this.render();
  },
  methods: {
    render(width?: number, height?: number): void {
      if (this.dimensionsData === null) return;
      const svgWidth = width || this.initialWidth;
      const svgHeight = height || this.initialHeight;
      const options: ParallelCoordinatesOptions = {
        width: svgWidth,
        height: svgHeight,
        showBaselineDefaults: this.showBaselineDefaults,
        applyDefaultSelection: this.applyDefaultSelection
      };
      const refSelection = d3.select((this.$refs as any).pcsvg);
      refSelection.selectAll('*').remove();
      renderParallelCoordinates(
        refSelection,
        options,
        this.dimensionsData,
        this.selectedDimensions,
        this.ordinalDimensions,
        this.onLinesSelection
      );
    },
    onLinesSelection(selectedLines?: Array<ScenarioData> /* array of selected lines on the PCs plot */): void {
      if (selectedLines && Array.isArray(selectedLines)) {
        this.$emit('select-scenario', { scenarios: selectedLines });
      }
    }
  }
});
</script>

<style lang="scss" scoped>
  @import "~styles/variables";

  .parallel-coordinates-container {
    height: 100%;
    width: 100%;
    padding-left: 1rem;
    padding-right: 1rem;

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
        fill-opacity: .3;
        fill:darkred;
        shape-rendering: crispEdges;
      }

      ::v-deep(.axis .pc-brush .handle) {
        stroke: black;
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
