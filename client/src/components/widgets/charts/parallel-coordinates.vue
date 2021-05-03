<template>
  <div
    ref="pcChart"
    class="parallel-coordinates-container">
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
</template>

<script lang="ts">
import * as d3 from 'd3';
import _ from 'lodash';
import { renderParallelCoordinates, renderBaselineMarkers } from '@/charts/parallel-coordinates';
import { defineComponent, PropType } from 'vue';
import { ScenarioData } from '@/types/Common';
import { DimensionInfo } from '@/types/Model';
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
    showBaselineDefaults: {
      type: Boolean,
      default: false
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
  computed: {
    getDefaultSize() {
      const parentElement: HTMLElement = (this.$refs as any).pcChart.parentElement;
      return { width: parentElement.clientWidth, height: parentElement.clientHeight };
    }
  },
  watch: {
    dimensionsData(): void {
      const sz = this.getDefaultSize;
      this.render(sz.width, sz.height);
    },
    showBaselineDefaults(): void {
      // do not re-render everything, just update markers visibility
      renderBaselineMarkers(this.showBaselineDefaults);
    },
    newRunsMode(): void {
      const sz = this.getDefaultSize;
      this.render(sz.width, sz.height);
    },
    initialDataSelection(): void {
      const sz = this.getDefaultSize;
      this.render(sz.width, sz.height);
    }
  },
  mounted(): void {
    const sz = this.getDefaultSize;
    this.render(sz.width, sz.height);
  },
  methods: {
    resizeDebounced: _.debounce(function(this: any, width, height) {
      this.render(width, height);
    }, RESIZE_DELAY),
    resize: function (size: {width: number; height: number}) {
      this.resizeDebounced.bind(this)(size.width, size.height);
    },
    render(width: number, height: number): void {
      if (this.dimensionsData === null || this.dimensionsData.length === 0) return;
      const options: ParallelCoordinatesOptions = {
        width,
        height,
        showBaselineDefaults: this.showBaselineDefaults,
        initialDataSelection: this.initialDataSelection,
        newRunsMode: this.newRunsMode
      };
      const refSelection = d3.select((this.$refs as any).pcsvg);
      refSelection.selectAll('*').remove();
      renderParallelCoordinates(
        refSelection,
        options,
        this.dimensionsData,
        this.selectedDimensions,
        this.ordinalDimensions,
        this.onLinesSelection,
        this.onGeneratedRuns
      );
    },
    onLinesSelection(selectedLines?: Array<ScenarioData> /* array of selected lines on the PCs plot */): void {
      if (selectedLines && Array.isArray(selectedLines)) {
        this.$emit('select-scenario', { scenarios: selectedLines });
      }
    },
    onGeneratedRuns(generatedLines?: Array<ScenarioData> /* array of generated lines on the PCs plot */): void {
      if (generatedLines && Array.isArray(generatedLines)) {
        this.$emit('generated-scenarios', { scenarios: generatedLines });
      }
    }
  }
});
</script>

<style lang="scss" scoped>
  @import "~styles/variables";

  .parallel-coordinates-container {
    position: relative;
    width: 100%;
    height: 100%;

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
