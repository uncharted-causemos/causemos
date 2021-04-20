<template>
  <div style="padding-left: 1rem">
    <div class="baseline-checkbox">
      <label @click="toggleBaselineDefaultsVisibility()">
        <i
          class="fa fa-lg fa-fw"
          :class="{ 'fa-check-square-o': showBaselineDefaults, 'fa-square-o': !showBaselineDefaults }"
        />
        Baseline Defaults
      </label>
    </div>
  </div>
  <div
    ref="pcChart"
    class="parallel-coordinates-container"
  >
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
    applyDefaultSelection: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'select-scenario'
  ],
  data: () => ({
    showBaselineDefaults: false
  }),
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
      if (this.dimensionsData === null) return;
      const options: ParallelCoordinatesOptions = {
        width,
        height,
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
    },
    toggleBaselineDefaultsVisibility() {
      this.showBaselineDefaults = !this.showBaselineDefaults;
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


.baseline-checkbox {
    display: inline-block;
    label {
      font-weight: normal;
      cursor: pointer;
      margin: 0;
    }
  }
</style>