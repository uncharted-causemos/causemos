<template>
  <svg ref="chart" />
</template>

<script>
import _ from 'lodash';
import * as d3 from 'd3';
import svgUtil from '@/utils/svg-util';
import indicatorValueFormatter from '@/filters/indicator-value-formatter';
import { SELECTED_COLOR, FADED_COLOR, MARKER_COLOR } from '@/utils/colors-util';

const PROJECTION_COLOR = FADED_COLOR;
const BASELINE_PROJECTION_COLOR = '#000';
const MARKER_RADIUS = 2.5;
const MARKER_COLOR_INITIAL_PERTURBATION = '#000';
const MARKER_COLOR_USER_PERTURBATION = MARKER_COLOR;

export default {
  name: 'SummaryChart',
  props: {
    indicator: {
      type: Object,
      default: () => ({})
    },
    experiments: {
      type: Array,
      default: () => []
    },
    selectedExperimentId: {
      type: String,
      default: () => ''
    },
    domain: {
      type: Object,
      default: () => ({ x: [0, 1], y: [0, 1] })
    },
    config: {
      type: Object,
      default: null
    }
  },
  watch: {
    domain() {
      this.refresh();
    },
    selectedExperimentId() {
      this.updateSelection();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      const svg = d3.select(this.$refs.chart);
      const margin = this.config.margin;

      const parentNode = svg.node().parentNode;
      const width = parentNode.clientWidth;
      const height = parentNode.clientHeight;

      const H = height - margin.top - margin.bottom;

      svg.selectAll('*').remove();
      this.summaryChart = svgUtil.createChart(svg, width, height)
        .style('overflow', 'visible')
        .append('g')
        .attr('transform', svgUtil.translate(margin.left, margin.top));

      this.yscale = d3.scaleLinear().domain(this.domain.y).range([H, 0]).clamp(true);
      this.renderYAxis();
      this.renderSummaries(H);
    },
    checkHighlightColor({ experimentId, isBaseline }) {
      if (experimentId === this.selectedExperimentId) return SELECTED_COLOR;
      if (isBaseline) return BASELINE_PROJECTION_COLOR;
      return PROJECTION_COLOR;
    },
    updateSelection() {
      const updateColor = d => this.checkHighlightColor(d);
      this.summaryChart.selectAll('.summary-block').style('stroke', updateColor);
      this.summaryChart.selectAll('.summary-marker').style('fill', updateColor);
      this.summaryChart.selectAll('.summary-marker').style('stroke', updateColor);
    },
    renderSummaries(height) {
      const rectWidth = 30;
      const offset = 10;
      const experiments = this.experiments;
      const yscale = this.yscale;
      const self = this;
      const svg = d3.select(this.$refs.chart);

      const summaries = this.summaryChart.selectAll('.experiment-summary')
        .data(experiments)
        .enter()
        .append('g')
        .classed('experiment-summary', true)
        .attr('transform', svgUtil.translate(offset, 0))
        .attr('cursor', 'pointer');

      const colorFn = d => this.checkHighlightColor(d);

      // Add background
      summaries.append('rect')
        .attr('class', 'summary-block')
        .attr('width', rectWidth)
        .attr('x', (d, i) => (i * (rectWidth + offset)))
        .attr('height', height)
        .style('fill', '#ffffff')
        .style('stroke', colorFn)
        .style('stroke-width', 0.5);

      // Initial value
      const startPosition = (rectWidth + offset);
      const initialValueShift = (rectWidth * 0.5 - offset);
      summaries
        .append('circle')
        .attr('class', 'summary-marker')
        .attr('cx', (d, i) => i * startPosition + initialValueShift)
        .attr('cy', (d) => yscale(_.first(d.results.values).value))
        .attr('r', MARKER_RADIUS)
        .style('fill', colorFn);

      // Last value
      const lastValueShift = (rectWidth * 0.5 + offset);
      summaries
        .append('circle')
        .attr('class', 'summary-marker')
        .attr('cx', (d, i) => i * startPosition + lastValueShift)
        .attr('cy', (d) => yscale(_.last(d.results.values).value))
        .attr('r', MARKER_RADIUS)
        .style('fill', colorFn);

      // Line between initial and last value
      summaries.append('path')
        .attr('class', 'summary-marker')
        .attr('d', (d, i) => {
          const x1 = i * startPosition + initialValueShift;
          const y1 = yscale(_.first(d.results.values).value);
          const x2 = i * startPosition + lastValueShift;
          const y2 = yscale(_.last(d.results.values).value);
          return svgUtil.line(x1, y1, x2, y2);
        })
        .style('stroke', colorFn);

      // Text for experiment index
      summaries.append('text')
        .attr('x', (d, i) => i * startPosition + (rectWidth * 0.5))
        .attr('y', height)
        .attr('fill', '#000000')
        .text((d, i) => d.isBaseline ? 'B' : i)
        .style('text-anchor', 'middle')
        .style('alignment-baseline', 'middle')
        .style('text-shadow', '0px 1px #888888');

      // X axis line
      summaries.append('path')
        .attr('d', (d, i) => {
          const x1 = i * startPosition;
          const y1 = yscale(0);
          const x2 = (i * startPosition) + rectWidth;
          const y2 = yscale(0);
          return svgUtil.line(x1, y1, x2, y2);
        })
        .style('fill', 'none')
        .style('stroke', '#888888')
        .style('opacity', 0.4);

      // Perturbation arrow
      const perturbationColorFn = (d) => {
        if (d.config.perturbation === this.indicator.delphi.initial_perturbation) { // FIXME: d.config (retrieved from experiments) should have a sub-object delphi in which perturbation should be stored
          return MARKER_COLOR_INITIAL_PERTURBATION;
        } else return MARKER_COLOR_USER_PERTURBATION;
      };
      // Remove white spaces in concept names that cause problems with arrow heads
      const formattedconceptName = this.indicator.concept_name.replace(/\s/g, '');
      svg
        .select('defs')
        .selectAll('marker')
        .data(experiments)
        .enter()
        .append('marker')
        .attr('id', (d) => `arrowhead-${d.experimentId}-${formattedconceptName}`)
        .attr('viewBox', svgUtil.MARKER_VIEWBOX)
        .attr('refX', 1)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 9)
        .attr('markerHeight', 9)
        .attr('markerUnits', 'userSpaceOnUse')
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', svgUtil.ARROW)
        .style('stroke', 'none')
        .style('fill', perturbationColorFn);

      summaries.append('path')
        .attr('d', (d, i) => {
          const arrowLength = 10;
          const x1 = i * startPosition + initialValueShift;
          const y1 = yscale(_.first(d.results.values).value);
          const x2 = x1 + arrowLength;
          const y2 = y1 - d.config.perturbation * arrowLength;
          return svgUtil.line(x1, y1, x2, y2);
        })
        .style('stroke', perturbationColorFn)
        .attr('marker-end', (d) => `url(#arrowhead-${d.experimentId}-${formattedconceptName})`)
        .style('fill', perturbationColorFn)
        .attr('display', (d) => d.config.engine === 'delphi' ? null : 'none');

      // Events
      summaries.on('click', (d) => {
        self.$emit('select-experiment', d.experimentId);
      });
    },
    renderYAxis() {
      const yscale = this.yscale;
      const yaxis = d3.axisLeft()
        .scale(yscale)
        .ticks(2)
        .tickSize(2)
        .tickFormat(indicatorValueFormatter);

      this.summaryChart.append('g')
        .call(yaxis)
        .attr('stroke-opacity', 0.5)
        .style('font-size', '8px');
    }
  }
};
</script>
