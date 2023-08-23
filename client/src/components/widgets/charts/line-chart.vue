<template>
  <div class="line-chart-container">
    <resize-observer ref="resizeObserver" @notify="handleResize" />
    <svg ref="container" class="chart" />
  </div>
</template>

<script>
import _ from 'lodash';
import * as d3 from 'd3';
import moment from 'moment';
import svgUtil from '@/utils/svg-util';
import dateFormatter from '@/formatters/date-formatter';
import { DEFAULT_COLOR, SELECTED_COLOR, MARKER_COLOR } from '@/utils/colors-util';
import { chartValueFormatter } from '@/utils/string-util';

const RESIZE_DELAY = 50;

const DEFAULT_CONFIG = {
  margin: {
    top: 20,
    right: 40,
    bottom: 35,
    left: 50,
  },
};
const BAND_WIDTH = 30;

const RIGHT_ARROW_EVENT_CODE = 39;
const LEFT_ARROW_EVENT_CODE = 37;

const MARKER_RADIUS = 2.5;
/**
 * Line chart
 *
 * data example
 * [
 *  {
 *    name: 'series1', // optional
 *    color: 'red', // optional
 *    series: [
 *      { timestamp: 18234298402, value: 333}
 *      ...
 *    ]
 *  },
 *  {
 *    name: 'series2',
 *    color: 'blue',
 *    series: [
 *     { timestamp: 18234298404, value: 200}
 *     { timestamp: 18234298405, value: 110}
 *      ...
 *    ]
 *  }
 * ]
 */
export default {
  name: 'LineChart',
  props: {
    data: {
      type: Array,
      default: () => {
        return [];
      },
    },
    size: {
      type: Array,
      default: undefined,
    },
    config: {
      type: Object,
      default: () => DEFAULT_CONFIG,
    },
    showSelectionActions: {
      type: Boolean, // To display vertical bands to select specific date
      default: false,
    },
    selectableTimeSlices: {
      type: Array,
      default: () => {
        return [];
      },
    },
    selectedTimeSliceIndex: {
      type: Number,
      default: () => -1,
    },
    markedRegion: {
      type: Object,
      default: () => null,
    },
    enableKeystrokes: {
      type: Boolean, // To enable keystroke navigation
      default: false,
    },
  },
  data: () => ({
    // FIXME
    // eslint-disable-next-line
    _selectedTimeSliceIndex: -1,
    // Declare this method in data instead of in methods so that one debounced function is created
    //  for each instance of line-chart, rather than shared between them statically. This avoids
    //  the situation where multiple line-charts resize simultaneously, but all the calls are ignored
    //  by debounce() except one.
    resize: _.debounce(function () {
      this.refresh();
    }, RESIZE_DELAY),
  }),
  computed: {
    mainTimeSeries() {
      return this.data.filter((series) => series.name === '')[0];
    },
    seriesData() {
      let seriesData = this.mainTimeSeries.series;
      if (!_.isEmpty(this.selectableTimeSlices)) {
        seriesData = this.selectableTimeSlices.map((slice) => {
          return seriesData.find((s) => s.timestamp === slice);
        });
      }
      return seriesData;
    },
  },
  watch: {
    size(n, o) {
      if (_.isEqual(n, o)) return;
      this.resize();
    },
    data(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
    selectedTimeSliceIndex(n, o) {
      if (n === o) return;
      const selected = this.seriesData[n];
      this.select(selected, false);
    },
  },
  created() {
    this.chart = null;
    this.xscale = null;
    this.yscale = null;
    this.tooltip = null;
  },
  mounted() {
    this.refresh();
  },
  methods: {
    handleResize({ width, height }) {
      // TODO: This component has a lot of messy resize/refresh logic due to svg sizes being
      //  passed in via prop. We should move toward using CSS for sizing and dynamically
      //  updating svg size based on container element dimensions.
      //  If we can refactor all uses of this component to this new system, this component
      //  can be dramatically simplified.
      this.width = width;
      this.height = height;
      this.resize();
    },

    refresh() {
      const svg = d3.select(this.$refs.container);
      const config = Object.assign({}, DEFAULT_CONFIG, this.config);

      const margin = Object.assign({}, DEFAULT_CONFIG.margin, config.margin);

      if (this.size !== undefined) {
        const [width, height] = this.size;
        this.width = width;
        this.height = height;
      } else if (this.width === undefined || this.height === undefined) {
        // This is a fallback to handle the case where refresh() is called before
        //  handleResize is called
        this.width = this.$refs.resizeObserver.$el.clientWidth;
        this.height = this.$refs.resizeObserver.$el.clientHeight;
      }

      svg.selectAll('*').remove();
      const chart = svgUtil
        .createChart(svg, this.width, this.height)
        .append('g')
        .attr('transform', svgUtil.translate(margin.left, margin.top));
      this.chart = chart;

      if (_.isEmpty(this.data)) return;

      this.renderData();
      this.renderAxis();
      if (this.showSelectionActions) {
        this.renderSelectionActions();
      }
      if (this.enableKeystrokes) {
        this.keyStrokeBinding();
      }
    },
    renderData() {
      const data = this.data;
      const allSeries = data.reduce((prev, seriesData) => {
        return prev.concat(...seriesData.series);
      }, []);

      const margin = this.config.margin;
      const innerWidth = this.width - margin.left - margin.right;
      const innerHeight = this.height - margin.top - margin.bottom;

      // Define scales
      let xextent = d3.extent(allSeries, (d) => d.timestamp);
      let yextent = d3.extent(allSeries, (d) => d.value);
      if (_.isEmpty(allSeries)) {
        xextent = [0, 1];
        yextent = [0, 1];
      }

      // Extend x-extent to show the selected historical range in context
      if (!_.isEmpty(this.markedRegion)) {
        const min = _.minBy(this.mainTimeSeries.series, 'timestamp').timestamp;
        const max = _.maxBy(this.mainTimeSeries.series, 'timestamp').timestamp;
        xextent = [Math.min(min, this.markedRegion.start), Math.max(max, this.markedRegion.end)];
      }

      // ensure extent is an actual range
      const EPS = 0.0001;
      if (yextent[1] - yextent[0] < EPS) {
        yextent[0] -= 0.5;
        yextent[1] += 0.5;
      }

      // Create the value formatter
      this.valueFormatter = chartValueFormatter(...yextent);

      const xscale = d3.scaleLinear().domain(xextent).range([0, innerWidth]);

      const yscale = d3.scaleLinear().domain(yextent).range([innerHeight, 0]).clamp(true);

      this.xscale = xscale;
      this.yscale = yscale;

      if (this.markedRegion) {
        this.chart
          .append('rect')
          .attr('class', 'marked-region')
          .attr('x', xscale(this.markedRegion.start))
          .attr('y', 0)
          .attr('width', xscale(this.markedRegion.end) - xscale(this.markedRegion.start))
          .attr('height', yscale(0))
          .style('fill', SELECTED_COLOR)
          .style('fill-opacity', 0.1);
      }

      const group = this.chart
        .selectAll('.lines')
        .data(data)
        .enter()
        .append('g')
        .classed('lines', true);

      if (data[0].series.length === 1) {
        // If only a single data point
        group
          .filter((d) => d.name === '')
          .append('circle')
          .attr('class', 'line')
          .attr('cx', (d) => {
            return xscale(d.series[0].timestamp);
          })
          .attr('cy', (d) => {
            return yscale(d.series[0].value);
          })
          .attr('r', MARKER_RADIUS)
          .style('fill', (d) => (d.color ? d3.color(d.color) : DEFAULT_COLOR));

        group
          .append('text')
          .filter((d) => d.name !== '')
          .attr('transform', (d) => svgUtil.translate(innerWidth + 3, yscale(d.series[0].value)))
          .attr('dy', '.25em')
          .attr('text-anchor', 'start')
          .style('fill', (d) => (d.color ? d3.color(d.color) : SELECTED_COLOR))
          .text((d) => d.name);
      } else {
        // Add line
        group
          .append('path')
          .attr('class', 'line')
          .attr('d', (d) => svgUtil.timeseriesLine(xscale, yscale)(d.series))
          .style('stroke-width', 2)
          .style('stroke', (d) => (d.color ? d3.color(d.color) : DEFAULT_COLOR))
          .style('fill', 'transparent');

        // Mark where we have data points. Don't show if length > 50 as it produce too much clutter.
        group
          .filter((d) => d.name === '' && d.series.length < 50)
          .each(function (d) {
            d3.select(this)
              .selectAll('circle')
              .data(d.series)
              .enter()
              .append('circle')
              .attr('cx', (d) => xscale(d.timestamp))
              .attr('cy', (d) => yscale(d.value))
              .attr('r', 3)
              .style('stroke', '#FFF')
              .style('fill', DEFAULT_COLOR);
          });

        // Add area above 0
        // group
        //   .filter(d => d.name === '')
        //   .append('path')
        //   .attr('d', d => svgUtil.timeseriesArea(xscale, yscale, true)(d.series))
        //   .style('stroke', 'none')
        //   .style('fill', (d) => d.color ? d3.color(d.color) : DEFAULT_COLOR)
        //   .style('opacity', 0.3);

        // // Add area below 0
        // group
        //   .filter(d => d.name === '')
        //   .append('path')
        //   .attr('d', d => svgUtil.timeseriesArea(xscale, yscale, false)(d.series))
        //   .style('stroke', 'none')
        //   .style('fill', (d) => d.color ? d3.color(d.color) : DEFAULT_COLOR)
        //   .style('opacity', 0.3);

        // Add line label
        group
          .append('text')
          .filter((d) => d.name !== '')
          .attr('transform', (d) => svgUtil.translate(innerWidth + 3, yscale(d.series[0].value)))
          .attr('dy', '.25em')
          .attr('text-anchor', 'start')
          .style('fill', (d) => (d.color ? d3.color(d.color) : SELECTED_COLOR))
          .text((d) => d.name);
      }
      this.tooltip = svgUtil.addCrosshairTooltip({
        chart: this.chart,
        xscale: this.xscale,
        yscale: this.yscale,
        seriesData: this.seriesData,
        valueFormatter: this.valueFormatter,
        dateFormatter,
      });
    },
    renderAxis() {
      const xscale = this.xscale;
      const yscale = this.yscale;
      const margin = this.config.margin;
      const innerWidth = this.width - margin.right - margin.left;
      // Calculate number of ticks dynamically for X axis
      // 1. Find min and max values
      const xextent = xscale.domain();

      // 2. Calculate number of ticks
      const distanceBetweenTicks = 80;
      const numberOfticks = innerWidth / distanceBetweenTicks;
      // 3.Calculate how many months are between start and end dates
      const start = moment.utc(xextent[0]);
      const end = moment.utc(xextent[1]);
      const duration = moment.duration(end.diff(start)).asMonths();
      // 4. Calculate tick interval
      let tickInterval = Math.round(duration / (numberOfticks - 1));
      // HACK: for 1 month duration or smaller than 1 numberOfTicks where tickInterval would not be a positive integer
      tickInterval = tickInterval <= 0 || !Number.isInteger(tickInterval) ? 1 : tickInterval;

      // 5. Define tick points
      const ticksXaxis = svgUtil.calculateTicks(xextent, tickInterval);

      // Calculate tick values for Y axis (min, max, and the first value for the selected function timeseries)
      const [min, max] = yscale.domain();
      let ticksYAxis = [min, max];
      if (!_.isEmpty(this.data.filter((d) => d.name !== ''))) {
        const func = this.data.filter((d) => d.name !== '')[0].series[0].value; // We pick the first value of that array because the rest of the values are the same
        ticksYAxis = _.uniq([min, func, max]);
      }

      // Define the axes
      const xaxis = d3.axisBottom().scale(xscale).tickSizeOuter(0).tickValues(ticksXaxis);

      const yaxis = d3
        .axisLeft()
        .scale(yscale)
        .tickValues(ticksYAxis)
        .tickFormat(this.valueFormatter);

      // Add the X axis
      this.chart
        .append('g')
        .call(xaxis)
        .attr('class', 'x-axis')
        .attr('transform', svgUtil.translate(0, yscale(0)))
        .attr('stroke-opacity', 0.5);

      // Break tick x axis labels in two lines
      this.chart
        .selectAll('.x-axis .tick text')
        .text('')
        .append('tspan')
        .attr('x', 0)
        .attr('dy', '.6em')
        .text((d) => dateFormatter(d, 'MMM'))
        .append('tspan')
        .attr('x', 0)
        .attr('dy', '.9em')
        .text((d) => dateFormatter(d, 'YYYY'));

      // Add the Y axis
      this.chart.append('g').call(yaxis).attr('class', 'y-axis').attr('stroke-opacity', 0.5);
    },
    renderSelectionActions() {
      const xscale = this.xscale;
      const margin = this.config.margin;
      const innerHeight = this.height - margin.top - margin.bottom;
      if (innerHeight < 0) {
        // Indiciation that the line-chart component is animating its size to or from 0,
        //  such as when full-screening a card on the Data space.
        // Return early to avoid `invalid height` errors.
        return;
      }

      const series = this.seriesData;

      // Create annotation to show on click
      const BAND_WIDTH = 30;
      const group = this.chart.append('g').classed('annotation-container', true);

      // add band
      group
        .append('rect')
        .attr('class', 'annotation-band')
        .attr('width', BAND_WIDTH * 0.5)
        .attr('height', innerHeight)
        .style('fill', SELECTED_COLOR)
        .style('opacity', 0.3)
        .style('display', 'none');

      // add circle
      group
        .append('circle')
        .attr('class', 'annotation-circle')
        .attr('r', MARKER_RADIUS * 2) // slightly larger than our points
        .style('fill', MARKER_COLOR)
        .style('opacity', 0.5)
        .style('display', 'none');

      // add labels
      group.append('text').attr('class', 'annotation-date');
      group.append('text').attr('class', 'annotation-value');

      // Selection of a time point
      const bisectDate = d3.bisector((d) => d.timestamp).left;
      this.chart.select('.event-overlay').on('click', (evt) => {
        if (!series.length) {
          return;
        }
        if (series.length === 1) {
          this.select(series[0]);
          return;
        }
        const xPos = xscale.invert(d3.pointer(evt)[0]);
        const elementIndex =
          bisectDate(series, xPos, 1) >= series.length
            ? series.length - 1
            : bisectDate(series, xPos, 1);
        const prevElement = series[elementIndex - 1];
        const nextElement = series[elementIndex];
        const d =
          xPos - prevElement.timestamp > nextElement.timestamp - xPos ? nextElement : prevElement;

        this.select(d);
      });
      // Select last time slice by default or preset selected timeseries index
      const selectedTimeSlice = _.isNil(this.selectedTimeSliceIndex)
        ? _.last(series)
        : series[this.selectedTimeSliceIndex];
      this.select(selectedTimeSlice, false);
    },
    keyStrokeBinding() {
      // Keystrokes binding
      d3.select('body').on('keyup', (evt) => {
        if (evt.keyCode === RIGHT_ARROW_EVENT_CODE) {
          this.next();
        }
        if (evt.keyCode === LEFT_ARROW_EVENT_CODE) {
          this.prev();
        }
      });
    },
    next() {
      let nextIndex = this._selectedTimeSliceIndex + 1;
      // Reset to 0 if we reach the end
      if (nextIndex >= this.seriesData.length) {
        nextIndex = 0;
      }

      const data = this.seriesData[nextIndex];
      this.select(data);
    },
    prev() {
      let prevIndex = this._selectedTimeSliceIndex - 1;

      // Back to last step if we are at the beginning
      if (prevIndex < 0) {
        prevIndex = this.seriesData.length - 1;
      }
      const data = this.seriesData[prevIndex];
      this.select(data);
    },
    select(data, emitEvent = true) {
      const xscale = this.xscale;
      const yscale = this.yscale;
      const series = this.seriesData;
      const band = this.chart.select('.annotation-band');
      const circle = this.chart.select('.annotation-circle');
      const annotationValue = this.chart.select('.annotation-value');
      const annotationDate = this.chart.select('.annotation-date');

      const margin = this.config.margin;
      if (!data) {
        band.style('display', 'none');
        circle.style('display', 'none');
        annotationValue.style('display', 'none');
        annotationDate.style('display', 'none');
        return;
      }
      // Draw the annotation
      band
        .style('display', null)
        .attr('x', xscale(data.timestamp) - BAND_WIDTH * 0.5 * 0.5)
        .attr('y', 0);

      circle
        .style('display', null)
        .attr('cx', xscale(data.timestamp))
        .attr('cy', yscale(data.value));

      annotationDate
        .style('display', null)
        .attr('x', xscale(data.timestamp))
        .attr('y', yscale(0) + margin.bottom)
        .style('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .style('fill', MARKER_COLOR)
        .text(dateFormatter(data.timestamp, 'YYYY-MMM'));

      annotationValue
        .style('display', null)
        .attr('x', xscale(data.timestamp))
        .attr('y', -5)
        .style('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .style('fill', MARKER_COLOR)
        .text(this.valueFormatter(data.value));

      this._selectedTimeSliceIndex = series.findIndex((d) => d.timestamp === data.timestamp);
      emitEvent && this.$emit('selection', this._selectedTimeSliceIndex);
    },
  },
};
</script>

<style lang="scss" scoped>
.line-chart-container {
  position: relative;
  display: flex;
  flex-direction: row;
  padding: 5px;
  box-sizing: border-box;
  cursor: pointer;
  background: #fff;
}
</style>
