<template>
  <svg ref="container" class="chart" />
</template>

<script>
import _ from 'lodash';
import * as d3 from 'd3';
import { mapActions } from 'vuex';

import svgUtil from '@/utils/svg-util';
import { calcEdgeColor } from '@/utils/scales-util';
import { SELECTED_COLOR } from '@/utils/colors-util';

const ABSENT_NODES_STYLES = {
  fontSize: '8px',
  fill: '#999',
  text: '\uf00d',
};

const DEFAULT_STYLE = {
  node: {
    stroke: '#111',
    strokeWidth: 0.5,
    highlighted: {
      stroke: SELECTED_COLOR,
      strokeWidth: 3,
    },
  },
};

export default {
  name: 'ArcDiagram',
  props: {
    data: {
      type: Object,
      default: () => ({}), // model, graph, and order
    },
    highlights: {
      type: Object,
      default: () => ({}),
    },
    edgeThicknessScale: {
      type: Function,
      default: () => {
        return 3;
      },
    },
    hovered: {
      type: String,
      default: '',
    },
    config: {
      type: Object,
      default: () => ({}),
    },
  },
  data: () => ({
    model: {},
  }),
  watch: {
    data() {
      this.refresh();
    },
    highlights() {
      this.clearHighlights();
      this.highlightSubgraph();
    },
    hovered() {
      this.clearHighlights();
      this.highlightSubgraph();
      this.highlightHovered();
    },
  },
  created() {
    this.chart = null;
    this.nodes = null;
    this.edges = null;
    this.yscale = null;
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      setSelectedNode: 'graph/setSelectedNode',
      setSelectedEdge: 'graph/setSelectedEdge',
    }),
    refresh() {
      if (_.isEmpty(this.data)) return;
      const svg = d3.select(this.$refs.container);
      const config = this.config;
      const margin = config.margin;

      const graph = this.data.graph;
      const nodesOrder = this.data.order;
      // Build array of nodes and check present/absent nodes for the specific model
      const nodes = nodesOrder.map((n) => {
        const match = graph.nodes.filter((node) => node.concept === n);
        const node = !_.isEmpty(match) ? match[0] : { concept: n, count: 0 };
        return node;
      });
      const edges = graph.edges;
      this.nodes = nodes;
      this.edges = edges;

      const outerWidth = 270;
      const outerHeight = nodes.length * config.itemHeight + (margin.top + margin.bottom);
      this.outerWidth = outerWidth;
      this.outerHeight = outerHeight;

      const width = outerWidth - margin.right - margin.left;
      const height = outerHeight - margin.top - margin.bottom;
      this.width = width;
      this.height = height;

      // Keep to a constant height if possible
      const groupHeight = config.itemHeight;
      const yscale = d3
        .scalePoint()
        .range([5, groupHeight * (nodes.length - 1)])
        .domain(nodes.map((node) => node.concept));
      this.yscale = yscale;

      svg.selectAll('*').remove();
      const chart = svgUtil
        .createChart(svg, outerWidth, outerHeight)
        .append('g')
        .attr('transform', svgUtil.translate(margin.left, margin.top));
      this.chart = chart;

      svg.on('click', this.clearSelection);
      this.renderEdges();
      this.renderNodes();
    },
    renderNodes() {
      const chart = this.chart;
      const nodes = this.nodes;

      const yscale = this.yscale;

      const width = this.width;

      const xCenter = 0.5 * width;
      // Draw nodes
      const node = chart.selectAll('.nodes').data(nodes).enter().append('g').attr('class', 'nodes');

      node
        .append('path')
        .attr('transform', (d) => svgUtil.translate(xCenter, yscale(d.concept)))
        .attr('d', () => {
          const symbol = d3.symbolCircle;
          const generator = d3.symbol().type(symbol).size(150);
          return generator();
        })
        .style('stroke', DEFAULT_STYLE.node.stroke)
        .style('stroke-width', DEFAULT_STYLE.node.strokeWidth)
        .style('fill', '#111')
        .attr('cursor', 'pointer');

      // Tooltip
      node.append('title').text((d) => d.concept);
      // Events
      node
        .on('click', this.selectNode)
        .on('mouseover', this.hoverNode)
        .on('mouseout', this.clearHover);

      // Distinguish absent/present nodes in a model
      chart
        .selectAll('.absent-icon')
        .data(nodes)
        .enter()
        .append('text')
        .filter((d) => d.count === 0)
        .attr('x', xCenter)
        .attr('y', (d) => yscale(d.id))
        .style('font-size', ABSENT_NODES_STYLES.fontSize)
        .attr('fill', ABSENT_NODES_STYLES.fill)
        .attr('class', 'fa')
        .text(ABSENT_NODES_STYLES.text)
        .style('text-anchor', 'middle')
        .style('alignment-baseline', 'middle')
        .on('mouseover', this.hoverNode)
        .on('mouseout', this.clearHover);
    },
    renderEdges() {
      const chart = this.chart;
      const edges = this.edges;
      const yscale = this.yscale;
      const edgeThicknessScale = this.edgeThicknessScale;
      const modelId = this.data.model.id;
      const width = this.width;
      const height = this.height;
      const outerWidth = this.outerWidth;
      const outerHeight = this.outerHeight;
      const svg = d3.select(this.$refs.container);

      svg
        .select('defs')
        .selectAll('marker')
        .data(edges)
        .enter()
        .append('marker')
        .attr('id', (d) => {
          const source = d.source.replace(/\s/g, '');
          const target = d.target.replace(/\s/g, '');
          return `arrowhead-${modelId}-${source}-${target}`;
        })
        .attr('viewBox', svgUtil.MARKER_VIEWBOX)
        .attr('refX', 2)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 15)
        .attr('markerHeight', 15)
        .attr('markerUnits', 'userSpaceOnUse')
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', svgUtil.ARROW)
        .style('fill', (d) => calcEdgeColor(d))
        .style('stroke', 'none');

      // Draw edges
      let maxXRadius = 0;
      const xCenter = 0.5 * width;
      const xOffset = 2.0;
      const xRadiusScale = d3
        .scaleLinear()
        .domain([0, height])
        .range([10, 0.5 * width - xOffset]);

      chart
        .selectAll('.edges')
        .data(edges)
        .enter()
        .append('path')
        .classed('edges', true)
        .attr('cursor', 'pointer')
        .attr('d', (d) => {
          const start = yscale(d.source); // position of start node on the Y axis
          const end = yscale(d.target); // position of end node on the Y axis
          const xPos = start < end ? xCenter - xOffset : xCenter + xOffset;
          const yRadius = Math.abs(0.5 * (end - start));
          const xRadius = Math.min(xRadiusScale(Math.abs(end - start)), yRadius);
          if (xRadius > maxXRadius) maxXRadius = xRadius;

          const offset = 7;
          if (start < end) {
            return svgUtil.arc(xPos, start, xPos - offset, end - offset, xRadius, yRadius);
          } else {
            return svgUtil.arc(xPos, start, xPos + offset, end + offset, xRadius, yRadius);
          }
        })
        .attr('marker-end', (d) => {
          const source = d.source.replace(/\s/g, '');
          const target = d.target.replace(/\s/g, '');
          return `url(#arrowhead-${modelId}-${source}-${target})`;
        })
        .style('fill', 'none')
        .style('stroke', (d) => calcEdgeColor(d))
        .style('stroke-width', (d) => edgeThicknessScale(d.total))
        .attr('stroke-dasharray', (d) => (d.contradictions > 0 ? 5 : 0))
        .on('click', this.selectEdge);

      // Post rendering adjustment to reclaim unused space
      const xBuffer = 10;
      const xAdjust = Math.max(0, 0.5 * outerWidth - maxXRadius - xBuffer);
      svg.attr('width', `${outerWidth - 2 * xAdjust}px`);
      svg.attr('viewBox', `${xAdjust} 0 ${outerWidth - 2 * xAdjust} ${outerHeight}`);
    },
    selectNode(evt, d) {
      const modelId = d.model_id;
      const obj = { concept: d.concept, modelId };
      this.$emit('select-node', obj);
      evt.stopPropagation();
    },
    selectEdge(evt, d) {
      const modelId = this.data.model.id;
      const obj = { edge: d, modelId };
      this.$emit('select-edge', obj);
      evt.stopPropagation();
    },
    hoverNode(evt, d) {
      this.$emit('hover-node', d.concept);
      evt.stopPropagation();
    },
    clearSelection(evt) {
      this.$emit('select-node', null);
      evt.stopPropagation();
    },
    clearHover(evt) {
      this.$emit('hover-node', null);
      evt.stopPropagation();
    },
    clearHighlights() {
      const svg = d3.select(this.$refs.container);
      this.chart
        .selectAll('.nodes path')
        .style('stroke', DEFAULT_STYLE.node.stroke)
        .style('stroke-width', DEFAULT_STYLE.node.strokeWidth);

      this.chart.selectAll('.nodes').style('opacity', 1);

      this.chart
        .selectAll('.edges')
        .style('opacity', 1)
        .style('stroke', (d) => {
          return calcEdgeColor(d);
        });
      svg.selectAll('defs path').style('fill', (d) => calcEdgeColor(d));
    },
    highlightSubgraph() {
      if (_.isEmpty(this.highlights)) return;
      const modelId = this.data.model;

      if (!_.isEmpty(this.highlights.selectedNode)) {
        this.chart
          .selectAll('.nodes path')
          .filter(
            (d) => d.concept === this.highlights.selectedNode && modelId === this.highlights.modelId
          )
          .style('stroke', SELECTED_COLOR)
          .style('stroke-width', DEFAULT_STYLE.node.highlighted.strokeWidth);
      }

      // Highlight neighborhood
      this.chart.selectAll('.nodes').style('opacity', (d) => {
        const match = this.checkPresentNode(this.highlights.nodes, d.concept);
        return !_.isEmpty(match) ? 1 : 0.1;
      });

      this.chart.selectAll('.edges').style('opacity', (d) => {
        const match = this.checkPresentEdge(this.highlights.edges, d);
        return !_.isEmpty(match) ? 1 : 0.1;
      });
    },
    highlightHovered() {
      if (_.isEmpty(this.hovered)) return;
      this.chart
        .selectAll('.nodes path')
        .filter((d) => d.concept === this.hovered)
        .style('stroke', SELECTED_COLOR)
        .style('stroke-width', DEFAULT_STYLE.node.highlighted.strokeWidth);
    },
    sameEdge(a, b) {
      return a.source === b.source && a.target === b.target;
    },
    checkPresentNode(arrayOfNodes, node) {
      if (_.isEmpty(arrayOfNodes)) return;
      const match = arrayOfNodes.filter((n) => n.concept === node);
      return match[0];
    },
    checkPresentEdge(arrayOfEdges, edge) {
      if (_.isEmpty(arrayOfEdges)) return;
      const match = arrayOfEdges.filter(
        (e) => e.source === edge.source && e.target === edge.target
      );
      return match[0];
    },
  },
};
</script>

<style lang="scss" scoped></style>
