<template>
  <div class="event-chart-container">
    <div class="row">
      <div
        class="col-md-1 controls"
        :style="top">
        <button
          v-tooltip.top="'Initial'"
          type="button"
          class="btn btn-primary btn-sm"
          @click="initial()">
          <i
            class="fa fa-fast-backward" />
        </button>
        <button
          v-tooltip.top="'Previous'"
          type="button"
          class="btn btn-primary btn-sm"
          @click="previous()">
          <i
            class="fa fa-step-backward" />
        </button>
        <button
          v-tooltip.top="'Next'"
          type="button"
          class="btn btn-primary btn-sm"
          @click="next()">
          <i
            class="fa fa-step-forward" />
        </button>
        <button
          v-tooltip.top="'Last'"

          type="button"
          class="btn btn-primary btn-sm"
          @click="last()">
          <i
            class="fa fa-fast-forward" />

        </button>
      </div>
      <div
        ref="container"
        class="col-md-11 event-chart"
      />
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import _ from 'lodash';

import moment from 'moment';
import SVGUtil from '@/utils/svg-util';
import EventsUtil from '@/utils/events-util';
import { SELECTED_COLOR, DEFAULT_COLOR, HIGHLIGHTED_COLOR, FADED_COLOR } from '@/utils/colors-util';

const TIME_SPAN = [1980, 2020];

export default {
  name: 'EventChart',
  props: {
    dataArray: {
      type: Array,
      default: () => ([])
    },
    highlightedData: {
      type: Array,
      default: () => ([])
    }
  },
  data: () => ({
    chart: null,
    width: 0,
    height: 0,
    binsOrdered: [],
    filteredBins: [],
    selectedBin: null,
    indexBin: -1
  }),
  computed: {
    top() { // Alignment with the top timeline
      const brushHeight = this.brushHeight;
      return { top: brushHeight + 'px' };
    }
  },
  watch: {
    dataArray: function dataArrayChanged() {
      this.refresh();
    },
    highlightedData: function highlightedDataChanged() {
      this.clearHighlights();
      this.highlightEvents();
    }
  },
  created() {
    this.globalScale = null;
    this.localizedScale = null;
    this.yScale = null;
    this.tooltip = null;
    this.tooltipWidth = 175;
    this.tooltipHeight = 30;
    this.brushHeight = 40;
    this.margin = { top: 10, right: 30, bottom: 10, left: 10 };
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      this.render();
    },
    clearCanvas() {
      d3.select(this.$refs.container).selectAll('*').remove();
    },
    render() {
      this.clearCanvas();
      const dataArray = this.dataArray;

      const brushHeight = this.brushHeight;

      const margin = this.margin;
      const containerDiv = this.$refs.container;
      const width = containerDiv.clientWidth;
      const height = brushHeight * 2 + margin.top + margin.bottom + this.tooltipHeight;
      this.width = width;
      this.height = height;

      const self = this;

      const chart = d3.select(this.$refs.container)
        .append('svg')
        .attr('width', width + 'px')
        .attr('height', height + 'px')
        .attr('preserveAspectRatio', 'xMinYMin meet')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .on('click', this.unselectEventDetail)
        .append('g')
        .style('fill', 'transparent')
        .attr('transform', SVGUtil.translate(margin.left, margin.top + margin.bottom));
      this.chart = chart;

      // Time span of 1980-2020
      const start = moment.utc({ y: TIME_SPAN[0] }).valueOf();
      const end = moment.utc({ y: TIME_SPAN[1] }).valueOf();

      const extent = [start, end];

      const startXaxis = margin.left;
      const endXaxis = margin.right * 2;

      // X axis scales
      this.globalScale = d3.scaleLinear().domain(extent).range([startXaxis, width - endXaxis]).clamp(true);
      const globalScale = this.globalScale;

      this.localizedScale = d3.scaleLinear().domain(extent).range([startXaxis, width - endXaxis]).clamp(true);
      const localizedScale = this.localizedScale;

      // Brush
      const brush = d3.brushX()
        .extent([[startXaxis, 0], [width - endXaxis, brushHeight]])
        .on('start brush end', brushed);

      // Create bins by month
      const bins = EventsUtil.createBins(extent[0], extent[1]);
      // Assign the events to the corresponding bins
      dataArray.map(conceptData => {
        conceptData.events.forEach(event => {
          bins.forEach(bin => {
            // Check if the event duration is included in the bin span
            if (EventsUtil.checkIntervalsOverlaps([event.start, event.end], [bin.start, bin.end])) {
              bin.events.push(event);
            }
          });
        });
      });

      const binsOrdered = _.orderBy(bins, 'start');
      this.binsOrdered = binsOrdered;

      // Given a time window of 15 years, calculate the time period with the highest number of events to focus the brush slider
      const timeWindow = 15;
      const earliestDate = globalScale.domain()[0];
      const latestDate = globalScale.domain()[1];
      const arrayOfStats = [];
      for (let year = moment.utc(earliestDate).year(); year <= moment.utc(latestDate).year(); year = year + timeWindow) {
        const range = [year, year + timeWindow];
        const binsWithinRange = binsOrdered.filter(bin => moment.utc(bin.start).year() >= range[0] && moment.utc(bin.end).year() <= range[1]);
        if (!_.isEmpty(binsWithinRange)) {
          arrayOfStats.push({
            range,
            nevents: _.sumBy(binsWithinRange, 'events.length')
          });
        }
      }

      // Get the date range for the max number of events
      const maxDataPoint = _.orderBy(arrayOfStats, d => d.nevents, ['desc'])[0];
      const maxStartDate = moment.utc({ y: maxDataPoint.range[0] }).valueOf(); // Transform back to timestamp
      const maxEndDate = moment.utc({ y: maxDataPoint.range[1] }).valueOf(); // Transform back to timestamp

      // Y axis scale
      const yScale = d3.scaleLinear().range([brushHeight * 0.5, 0]).domain([0, d3.max(binsOrdered, d => d.events.length)]);
      this.yScale = yScale;

      // Create focus and context areas
      chart.append('defs').append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('width', width)
        .attr('height', brushHeight)
        .attr('x', 0)
        .attr('y', 0);

      const clip = chart.append('g')
        .attr('class', 'focus')
        .attr('transform', SVGUtil.translate(0, margin.top))
        .attr('clip-path', 'url(#clip)');

      const focus = chart.append('g')
        .attr('class', 'focus')
        .attr('transform', SVGUtil.translate(0, margin.top));

      const context = chart.append('g')
        .attr('class', 'context')
        .attr('transform', SVGUtil.translate(0, margin.top + brushHeight));

      const localizedAxis = d3.axisBottom().scale(localizedScale).tickFormat(d3.timeFormat('%Y'));
      focus.append('g')
        .attr('transform', SVGUtil.translate(0, brushHeight * 0.5))
        .attr('class', 'axis--x')
        .call(localizedAxis);

      clip.selectAll('.focus-bars')
        .data(binsOrdered)
        .enter()
        .append('rect')
        .attr('class', 'focus-bars')
        .attr('x', (d) => localizedScale(d.start))
        .attr('y', (d) => yScale(d.events.length))
        .attr('width', (d) => Math.abs(localizedScale(d.end) - localizedScale(d.start) - 1))
        .attr('height', (d) => brushHeight * 0.5 - yScale(d.events.length))
        .style('fill', DEFAULT_COLOR)
        .on('click', this.selectEventDetail)
        .on('dblclick', this.unselectEventDetail);

      context.selectAll('.context-bars')
        .data(binsOrdered)
        .enter()
        .append('rect')
        .attr('class', 'context-bars')
        .attr('x', (d) => globalScale(d.start))
        .attr('y', (d) => yScale(d.events.length))
        .attr('width', (d) => Math.abs(globalScale(d.end) - globalScale(d.start) - 1))
        .attr('height', (d) => brushHeight * 0.5 - yScale(d.events.length))
        .style('fill', DEFAULT_COLOR);

      const globalAxis = d3.axisBottom().scale(globalScale).tickFormat(d3.timeFormat('%Y'));
      context.append('g')
        .attr('transform', SVGUtil.translate(0, brushHeight * 0.5))
        .attr('class', 'axis--x')
        .call(globalAxis);

      const globalBrush = context.append('g')
        .attr('class', 'brush')
        .call(brush);
      const handle = globalBrush.selectAll('.handle--custom')
        .data([{ type: 'w' }, { type: 'e' }])
        .enter().append('path')
        .attr('class', 'handle-custom')
        .attr('fill', '#666')
        .attr('fill-opacity', 0.8)
        .attr('stroke', '#888')
        .attr('stroke-width', 1)
        .attr('cursor', 'ew-resize')
        .attr('d', d3.arc()
          .innerRadius(0)
          .outerRadius(18)
          .startAngle(0)
          .endAngle(function(d, i) { return i ? Math.PI : -Math.PI; })
        );

      // Set the brush to the time period with the highest number of events
      globalBrush.call(brush.move, [globalScale(maxStartDate), globalScale(maxEndDate)]);

      // Filter bins by brushed time period
      this.filteredBins = binsOrdered.filter(bin => {
        if (bin.events.length > 0) {
          return bin.start >= maxStartDate && bin.end <= maxEndDate;
        }
      });

      // Add tooltip
      const tooltip = chart.append('g').attr('class', 'localized-tooltip').style('display', 'none');
      tooltip.append('rect')
        .attr('class', 'tooltip-container')
        .attr('width', this.tooltipWidth)
        .attr('height', this.tooltipHeight)
        .style('fill', '#FFFFFF')
        .style('stroke', '#D3D3D3')
        .style('stroke-width', 1);

      tooltip.append('text')
        .attr('class', 'tooltip-text')
        .attr('dy', '.35em')
        .style('fill', '#000000')
        .style('text-anchor', 'middle')
        .style('font-size', '12px');
      this.tooltip = tooltip;

      function brushed() {
        const s = d3.event.selection;
        if (s == null) {
          handle.attr('display', 'none');
        } else {
          handle.attr('display', null).attr('transform', function(d, i) {
            return 'translate(' + s[i] + ',' + 20 + ')';
          });
          localizedScale.domain(s.map(globalScale.invert, globalScale));

          // If time range is < 10 years, change axis tick format
          const start = moment.utc(localizedScale.domain()[0]).year();
          const end = moment.utc(localizedScale.domain()[1]).year();
          if (end - start < 10) {
            localizedAxis.tickFormat(d3.timeFormat('%Y-%b'));
          } else {
            localizedAxis.tickFormat(d3.timeFormat('%Y'));
          }

          focus.selectAll('.axis--x').call(localizedAxis);
          clip.selectAll('.focus-bars')
            .attr('class', 'focus-bars')
            .attr('x', (d) => localizedScale(d.start))
            .attr('y', (d) => yScale(d.events.length))
            .attr('width', (d) => Math.abs(localizedScale(d.end) - localizedScale(d.start) - 1))
            .attr('height', (d) => brushHeight * 0.5 - yScale(d.events.length))
            .style('fill', DEFAULT_COLOR);

          // Update filtered bins
          self.filteredBins = binsOrdered.filter(bin => {
            if (bin.events.length > 0) {
              return bin.start >= localizedScale.domain()[0] && bin.end <= localizedScale.domain()[1];
            }
          });
          self.indexBin = -1;
        }
      }
    },
    highlightEvents() {
      const eventIds = this.highlightedData;
      if (_.isEmpty(eventIds)) {
        this.selectedBin = null;
        const tooltip = this.tooltip;
        tooltip.style('display', 'none');
      } else {
        // FIXME: It would be good to show the proportion of the bar that includes those event ids instead of coloring the whole bin
        this.chart.selectAll('.focus-bars, .context-bars').style('fill', (d) => {
          if (d.events.length > 0) {
            const arrayofIds = d.events.map(e => e.id);
            const found = _.intersection(arrayofIds, eventIds).length > 0;
            if (_.isEqual(d, this.selectedBin)) {
              return SELECTED_COLOR;
            } else if (found) {
              return HIGHLIGHTED_COLOR;
            } else {
              return FADED_COLOR;
            }
          }
        });
      }
    },
    selectEventDetail(selected) {
      event.stopPropagation();

      this.indexBin = this.filteredBins.indexOf(selected); // Store clicked bin index

      this.selectedBin = selected;

      const eventIds = selected.events.map(d => d.id);

      // Highlighting
      this.$emit('link-element', eventIds);

      // Set the selected bin for the side panel
      const obj = { startDate: selected.start, endDate: selected.end, eventIds };
      this.$emit('select-event-detail', obj);

      const tooltip = this.tooltip;
      const localizedScale = this.localizedScale;
      const yScale = this.yScale;
      const brushHeight = this.brushHeight;
      const margin = this.margin;

      const startDate = moment.utc(selected.start).format('DD MMM YYYY');
      const endDate = moment.utc(selected.end).format('DD MMM YYYY');

      tooltip.style('display', null);
      tooltip.attr('transform', () => {
        let x = localizedScale(selected.start) - this.tooltipWidth * 0.5;
        const y = yScale(selected.events.length) - brushHeight * 0.5;
        if (x <= localizedScale.range()[0]) { // To avoid cropped tooltips on both sides
          x = localizedScale.range()[0];
        } else if (x >= localizedScale.range()[1] - this.tooltipWidth * 0.5) {
          x = localizedScale.range()[1] - (margin.right * 2) - (this.tooltipWidth);
        }
        return SVGUtil.translate(x, y);
      });
      tooltip.selectAll('.tooltip-text')
        .attr('x', this.tooltipWidth * 0.5)
        .attr('y', this.tooltipHeight * 0.5)
        .text(`${startDate} - ${endDate} (${selected.events.length})`);
    },
    unselectEventDetail() {
      event.stopPropagation();
      this.selectedBin = null;
      this.$emit('link-element', null);
      const tooltip = this.tooltip;
      tooltip.style('display', 'none');
    },
    clearHighlights() {
      this.chart.selectAll('.focus-bars, .context-bars').style('fill', DEFAULT_COLOR);
    },
    previous() {
      if (this.indexBin === -1) return;
      this.indexBin--;

      // Back to last bin if we are at the beginning of the event timeline
      if (this.indexBin < 0) {
        this.indexBin = this.filteredBins.length - 1;
      }

      // Get ids corresponding to that particular bin
      const selectedBin = this.filteredBins[this.indexBin];
      this.selectEventDetail(selectedBin);
    },
    next() {
      this.indexBin++;
      // Reset to 0 if we reach the end
      if (this.indexBin >= this.filteredBins.length) {
        this.indexBin = 0;
      }
      // Get ids corresponding to that particular bin
      const selectedBin = this.filteredBins[this.indexBin];
      this.selectEventDetail(selectedBin);
    },
    initial() {
      this.indexBin = 0;
      const selectedBin = this.filteredBins[this.indexBin];
      this.selectEventDetail(selectedBin);
    },
    last() {
      this.indexBin = this.filteredBins.length - 1;
      const selectedBin = this.filteredBins[this.indexBin];
      this.selectEventDetail(selectedBin);
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.event-chart-container {
  overflow: hidden;
  .controls {
  display: flex;
  position: relative;
  z-index: map-get($z-index-order, events-bar);
  button {
    margin-right: 5px;
  }
}
}
</style>
