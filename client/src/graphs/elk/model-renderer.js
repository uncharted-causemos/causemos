import _ from 'lodash';
import * as d3 from 'd3';

import ElkBaseRenderer from '@/graphs/elk/elk-base-renderer';
import { createGraph } from '@/graphs/elk/elk-data';
import {
  truncateTextToWidth, translate,
  hideSvgTooltip, showSvgTooltip,
  getTranslateFromSVGTransform, closestPointOnPath, POLARITY_ICON_SVG_SETTINGS,
  MARKER_VIEWBOX, ARROW
} from '@/utils/svg-util';
import { calcEdgeColor, scaleByWeight } from '@/utils/scales-util';
import { hasBackingEvidence } from '@/utils/graphs-util';
import ConceptUtil from '@/utils/concept-util';
import { SELECTED_COLOR, EDGE_COLOR_PALETTE } from '@/utils/colors-util';
import { calculateScenarioPercentageChange } from '@/utils/projection-util';
import ontologyFormatter from '@/filters/ontology-formatter';
import renderHistoricalProjectionsChart from '@/charts/scenario-renderer';
import { interpolatePath } from 'd3-interpolate-path';

const DEFAULT_STYLE = {
  node: {
    fill: '#FFFFFF',
    stroke: '#999',
    strokeWidth: 0.5,
    borderRadius: 4,
    cursor: 'pointer',
    highlighted: {
      stroke: SELECTED_COLOR,
      borderRadius: 2,
      strokeWidth: 2
    }
  },
  edge: {
    fill: 'none',
    stroke: '#000',
    strokeWidth: 5,
    controlRadius: 6,
    strokeDash: '3,2'
  },
  edgeBg: {
    fill: 'none',
    stroke: 'white'
  },
  nodeHeader: {
    fill: '#F2F2F2',
    stroke: '#999',
    strokeWidth: 0.5,
    borderRadius: 4
  }
};

const OPACITY = 0.2;
const GRAPH_HEIGHT = 40;

const lineFn = d3.line()
  .x(d => d.x)
  .y(d => d.y)
  .curve(d3.curveBasis);

export default class ModelRenderer extends ElkBaseRenderer {
  setScenarioData(d) {
    this.scenarioData = d;
  }

  renderNodes() {
    const chart = this.chart;
    const nodes = chart.selectAll('.node')
      .data(this.layout.nodes, d => d.id);

    const newNodes = nodes.enter()
      .append('g')
      .classed('node', true);

    nodes.exit().remove();

    chart.selectAll('.node')
      .transition()
      .duration(500)
      .attrTween('transform', function (d) {
        const startTranslateState = d3.select(this).attr('transform');
        return d3.interpolateString(startTranslateState, translate(d.x, d.y));
      });

    newNodes
      .append('rect')
      .classed('node-container', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', DEFAULT_STYLE.node.borderRadius)
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .style('fill', DEFAULT_STYLE.node.fill)
      .style('stroke', DEFAULT_STYLE.node.stroke)
      .style('stroke-width', DEFAULT_STYLE.node.strokeWidth);

    const groupHeader = newNodes
      .append('g')
      .classed('node-header-group', true);

    // Node header
    const margin = 5;
    groupHeader.append('rect')
      .classed('node-header', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', DEFAULT_STYLE.nodeHeader.borderRadius)
      .attr('width', d => d.width)
      .attr('height', GRAPH_HEIGHT * 0.5)
      .style('fill', DEFAULT_STYLE.nodeHeader.fill)
      .style('stroke', DEFAULT_STYLE.nodeHeader.stroke)
      .style('stroke-width', DEFAULT_STYLE.nodeHeader.strokeWidth);

    // Circle = regular concepts, diamond = intervention concepts
    groupHeader.append('path')
      .attr('transform', translate(10, GRAPH_HEIGHT * 0.5 - (margin * 2)))
      .attr('d', (d) => {
        const symbol = ConceptUtil.isInterventionNode(d.id) ? d3.symbolDiamond : d3.symbolCircle;
        const diamondGenerator = d3.symbol()
          .type(symbol)
          .size(50);
        return diamondGenerator();
      })
      .style('stroke', 'none')
      .style('fill', '#111');

    groupHeader.append('text')
      .classed('node-label', true)
      .attr('transform', translate(20, GRAPH_HEIGHT * 0.5 - 6))
      .style('stroke', 'none')
      .style('fill', '#000')
      .style('font-weight', '600')
      .text(d => ontologyFormatter(d.concept))
      .each(function () { truncateTextToWidth(this, d3.select(this).datum().width - 30); });

    const groupBody = newNodes
      .append('g')
      .classed('node-body-group', true);

    // Node body
    groupBody.append('rect')
      .classed('node-body', true)
      .attr('x', 0)
      .attr('y', GRAPH_HEIGHT * 0.5)
      .attr('width', d => d.width)
      .attr('height', GRAPH_HEIGHT)
      .style('fill', 'transparent');
  }

  renderEdges() {
    const chart = this.chart;

    const edges = chart.selectAll('.edge')
      .data(this.layout.edges, d => d.id);

    const newEdges = edges.enter()
      .append('g')
      .classed('edge', true)
      .attr('cursor', 'pointer')
      .attr('d', d => lineFn(d.points));

    edges.exit().remove();

    newEdges
      .append('path')
      .classed('edge-path-bg', true)
      .style('fill', DEFAULT_STYLE.edgeBg.fill)
      .style('stroke', DEFAULT_STYLE.edgeBg.stroke)
      .attr('d', d => lineFn(d.points));

    chart.selectAll('.edge').select('.edge-path-bg')
      .style('stroke-width', d => {
        return scaleByWeight(DEFAULT_STYLE.edge.strokeWidth, d.data.parameter.weight) + 2;
      })
      .transition()
      .duration(500)
      .attrTween('d', function (d) {
        const currentPath = lineFn(d.points);
        const previousPath = d3.select(this).attr('d') || currentPath;
        return (t) => {
          return interpolatePath(previousPath, currentPath)(t);
        };
      });

    newEdges
      .append('path')
      .classed('edge-path', true)
      .style('fill', DEFAULT_STYLE.edge.fill);

    chart.selectAll('.edge').select('.edge-path')
      .style('stroke-dasharray', d => hasBackingEvidence(d.data) ? null : DEFAULT_STYLE.edge.strokeDash)
      .style('stroke', d => calcEdgeColor(d.data))
      .attr('marker-end', d => {
        const source = d.data.source.replace(/\s/g, '');
        const target = d.data.target.replace(/\s/g, '');
        return `url(#arrowhead-${source}-${target})`;
      })
      .attr('marker-start', d => {
        const source = d.data.source.replace(/\s/g, '');
        const target = d.data.target.replace(/\s/g, '');
        return `url(#start-${source}-${target})`;
      })
      .style('stroke-width', d => {
        return scaleByWeight(DEFAULT_STYLE.edge.strokeWidth, d.data.parameter.weight);
      })
      .transition()
      .duration(500)
      .attrTween('d', function (d) {
        const currentPath = lineFn(d.points);
        const previousPath = d3.select(this).attr('d') || currentPath;
        return (t) => {
          return interpolatePath(previousPath, currentPath)(t);
        };
      });

    // move all edges, to be drawn last
    chart.selectAll('.edge')
      .each(function () { this.parentNode.insertBefore(this, null); });
  }

  renderEdgeControls() {
    const chart = this.chart;

    const edgeControls = chart.selectAll('.edge-control');

    edgeControls
      .transition()
      .duration(500)
      .attrTween('transform', function () {
        return () => {
          // this is a bit odd because there is no transition per say, instead each time it just moves it back on to the line as the line is transitioned.
          const newTranslate = getTranslateFromSVGTransform(this.transform);
          const pathNode = d3.select(this.parentNode).select('.edge-path').node();
          const controlPoint = closestPointOnPath(pathNode, newTranslate);
          return translate(controlPoint[0], controlPoint[1]);
        };
      });

    edgeControls.selectAll('*').remove();

    edgeControls
      .append('circle')
      .attr('r', DEFAULT_STYLE.edge.controlRadius + 2)
      .style('fill', DEFAULT_STYLE.edgeBg.stroke)
      .attr('stroke', SELECTED_COLOR)
      .style('cursor', 'pointer');

    edgeControls
      .append('circle')
      .attr('r', DEFAULT_STYLE.edge.controlRadius)
      .style('fill', d => calcEdgeColor(d.data))
      .style('cursor', 'pointer');

    const controlStyles = POLARITY_ICON_SVG_SETTINGS;

    edgeControls
      .append('text')
      .attr('x', d => controlStyles[d.data.polarity].x)
      .attr('y', d => controlStyles[d.data.polarity].y)
      .style('background-color', 'red')
      .style('font-family', 'FontAwesome')
      .style('font-size', d => controlStyles[d.data.polarity]['font-size'])
      .style('stroke', 'none')
      .style('fill', 'white')
      .style('cursor', 'pointer')
      .text(d => controlStyles[d.data.polarity].text);
  }

  renderHistoricalAndProjections(selectedScenarioId) {
    const chart = this.chart;
    const self = this;

    chart.selectAll('.node').each(function(node) {
      const nodeWidth = node.width;
      const nodeHeight = node.height;
      const graphHeight = 32;
      const xAxisLeftPadding = 14;
      const nodeBodyGroup = d3.select(this).select('.node-body-group');
      const nodeHeaderGroup = d3.select(this).select('.node-header-group');

      // Create historical/projection chart
      const nodeScenarioData = self.scenarioData[node.concept];

      nodeBodyGroup.select('.historic-graph').remove();
      nodeBodyGroup.select('.indicator-label').remove();
      const graphEl = nodeBodyGroup
        .append('g')
        .classed('historic-graph', true)
        .attr('transform', translate(xAxisLeftPadding, nodeHeight - graphHeight));

      nodeBodyGroup
        .append('text')
        .classed('indicator-label', true)
        .attr('x', 5)
        .attr('y', nodeHeight - graphHeight - 1.5)
        .attr('width', nodeWidth)
        .style('font-size', '7px')
        .attr('fill', '#999')
        .text(nodeScenarioData.indicator_name)
        .each(function () { truncateTextToWidth(this, d3.select(this).attr('width') - 10); });

      const selectedScenario = nodeScenarioData.scenarios.find(s => s.id === selectedScenarioId);

      // Adjust node appearence based on result
      if (!_.isEmpty(selectedScenario.result)) {
        const percentageChange = calculateScenarioPercentageChange(selectedScenario.result, _.first(selectedScenario.result.values).value);
        const absoluteChange = _.last(selectedScenario.result.values).value - _.first(selectedScenario.result.values).value;

        // if first value is 0.0 then percentageChange is 0.0, so check absolute change as well
        if (percentageChange === 0.0 && absoluteChange === 0.0) {
          nodeHeaderGroup.select('.node-header')
            .style('fill', DEFAULT_STYLE.nodeHeader.fill)
            .style('stroke', DEFAULT_STYLE.nodeHeader.stroke);
        } else {
          // if percentageChange is 0, then absoluteChange defines the colour, as requested by the users
          const colour = (percentageChange === 0.0)
            ? ((absoluteChange < 0) ? EDGE_COLOR_PALETTE[0] : EDGE_COLOR_PALETTE[2])
            : ((percentageChange < 0) ? EDGE_COLOR_PALETTE[0] : EDGE_COLOR_PALETTE[2]);

          nodeHeaderGroup.select('.node-header')
            .style('fill', colour)
            .style('stroke', colour)
            .style('fill-opacity', 0.4);

          nodeHeaderGroup.style('stroke', colour);
        }
      }
      d3.select(this).attr('filter', (selectedScenario.constraints.length > 0) ? 'url(#node-shadow)' : null);

      const runOptions = {
        selectedScenarioId,
        miniGraph: true
      };
      const renderOptions = {
        margin: {
          top: 3, bottom: 3, left: 0, right: 0
        },
        width: nodeWidth - xAxisLeftPadding,
        height: graphHeight - 0.5
      };

      renderHistoricalProjectionsChart(graphEl, nodeScenarioData, renderOptions, runOptions);
    });
  }

  buildDefs() {
    // super.buildDefs();
    const svg = d3.select(this.svgEl);
    const edges = this.layout.edges;

    svg.select('defs').selectAll('*').remove();

    svg.select('defs')
      .selectAll('.edge-marker-end')
      .data(edges)
      .enter()
      .append('marker')
      .classed('edge-marker-end', true)
      .attr('id', d => {
        const source = d.data.source.replace(/\s/g, '');
        const target = d.data.target.replace(/\s/g, '');
        return `arrowhead-${source}-${target}`;
      })
      .attr('viewBox', MARKER_VIEWBOX)
      .attr('refX', 2)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 15)
      .attr('markerHeight', 15)
      .attr('markerUnits', 'userSpaceOnUse')
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', ARROW)
      .style('fill', d => calcEdgeColor(d.data))
      .style('stroke', 'none');

    svg.select('defs')
      .selectAll('.edge-marker-start')
      .data(edges)
      .enter()
      .append('marker')
      .classed('edge-marker-start', true)
      .attr('id', d => {
        const source = d.data.source.replace(/\s/g, '');
        const target = d.data.target.replace(/\s/g, '');
        return `start-${source}-${target}`;
      })
      .attr('viewBox', MARKER_VIEWBOX)
      .attr('markerUnits', 'userSpaceOnUse')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .append('svg:circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 4)
      .style('fill', d => calcEdgeColor(d.data))
      .style('stroke', '#FFF');

    svg.select('defs')
      .append('filter')
      .attr('id', 'node-shadow')
      .append('feDropShadow')
      .attr('dx', '.1')
      .attr('dy', '.2')
      .attr('stdDeviation', '2');

    return svg;
  }

  setData(data) {
    super.setData(data, {});
    const nodeSize = { width: DEFAULT_STYLE.node.width, height: DEFAULT_STYLE.node.height };
    this.graph = createGraph(data, { nodeSize });

    this.layout = null; // clear previous layout since it needs to be updated
    return this;
  }

  clearSelections() {
    const chart = this.chart;
    chart.selectAll('.node-container') // Clean up previous highlights
      .style('border-radius', DEFAULT_STYLE.node.borderRadius)
      .style('stroke', DEFAULT_STYLE.node.stroke)
      .style('stroke-width', DEFAULT_STYLE.node.strokeWidth);
  }

  selectNode(node) {
    node.select('.node-container')
      .style('border-radius', DEFAULT_STYLE.node.highlighted.borderRadius)
      .style('stroke', DEFAULT_STYLE.node.highlighted.stroke)
      .style('stroke-width', DEFAULT_STYLE.node.highlighted.strokeWidth);
  }

  selectEdge(evt, edge) {
    const mousePoint = d3.pointer(evt, edge.node());
    const pathNode = edge.select('.edge-path').node();
    const controlPoint = closestPointOnPath(pathNode, mousePoint);

    edge.append('g')
      .classed('edge-control', true)
      .attr('transform', translate(controlPoint[0], controlPoint[1]));

    this.render();
  }

  mouseEnterEdge(evt, edge) {
    edge.selectAll('.edge-mouseover-handle').remove();

    const mousePoint = d3.pointer(evt, edge.node());
    const pathNode = edge.select('.edge-path').node();
    const controlPoint = closestPointOnPath(pathNode, mousePoint);

    edge.append('g')
      .classed('edge-mouseover-handle', true)
      .attr('transform', translate(controlPoint[0], controlPoint[1]))
      .append('circle')
      .attr('r', DEFAULT_STYLE.edge.controlRadius)
      .style('fill', d => calcEdgeColor(d.data))
      .style('cursor', 'pointer');

    // make sure mouseover doesn't obscure the more important edge-control
    if (edge.selectAll('.edge-control').node() !== null) {
      edge.node().insertBefore(edge.selectAll('.edge-mouseover-handle').node(), edge.selectAll('.edge-control').node());
    }
  }

  mouseLeaveEdge(evt, edge) {
    edge.selectAll('.edge-mouseover-handle').remove();
  }

  enableSubInteractions() {
    const chart = this.chart;
    const nodesHeader = chart.selectAll('.node-header-group');
    const nodesBody = chart.selectAll('.node-body-group');
    const registry = this.registry;

    const registered = (eventName) => {
      return ({}.hasOwnProperty.call(registry, eventName));
    };

    this.chart.selectAll('.node').on('mouseenter', function (evt, d) {
      // if some of the label name was shortened, tooltip the whole label (so helpful)
      if (d.label.length !== d3.select(this).select('.node-label').text().replace(/^\*/, '').length) {
        showSvgTooltip(chart, (d.data.parameter.indicator_name === undefined) ? d.label : `${d.label}\n\n${d.data.parameter.indicator_name}`, [d.x + d.width / 2, d.y]);
      }
    }).on('mouseleave', function () {
      hideSvgTooltip(chart);
    });

    nodesHeader.on('mouseenter', function(evt) {
      evt.stopPropagation();

      const node = d3.select(this);
      const width = node.datum().width;
      if (node.datum().minimized === true) return;

      node.append('text')
        .classed('indicator-edit-icon', true)
        .attr('x', width - 18) // fitting icon
        .attr('y', 15) // fitting icon
        .style('font-family', 'FontAwesome')
        .style('font-size', '12px')
        .style('stroke', 'none')
        .style('fill', 'black')
        .style('cursor', 'pointer')
        .text('\uf044')
        .on('click', function(evt) {
          evt.stopPropagation();
          if (registered('nodeClick')) {
            registry.nodeClick(evt, d3.select(this), self);
          }
          d3.select(this).remove();
        });
    });

    nodesBody.on('mouseenter', function(evt) {
      evt.stopPropagation();

      const node = d3.select(this);
      const width = node.datum().width;
      if (node.datum().minimized === true) return;
      node.append('text')
        .classed('projection-edit-icon', true)
        .attr('x', width - 18) // fitting icon
        .attr('y', GRAPH_HEIGHT + 15) // fitting icon
        .style('font-family', 'FontAwesome')
        .style('font-size', '12px')
        .style('stroke', 'none')
        .style('fill', 'black')
        .style('cursor', 'pointer')
        .text('\uf044')
        .on('click', function(evt) {
          evt.stopPropagation();
          if (registered('nodeClick')) {
            registry.nodeClick(evt, d3.select(this), self);
          }
          d3.select(this).remove();
        });
    });

    nodesHeader.on('mouseleave', function(evt) {
      evt.stopPropagation();
      const node = d3.select(this);
      node.select('.indicator-edit-icon').remove();
    });

    nodesBody.on('mouseleave', function(evt) {
      evt.stopPropagation();
      const node = d3.select(this);
      node.select('.projection-edit-icon').remove();
    });
  }

  hideNeighbourhood() {
    const chart = this.chart;
    chart.selectAll('.node').style('opacity', 1);
    chart.selectAll('.edge').style('opacity', 1);
    chart.selectAll('.edge-control').remove();
  }

  // Highlights the neighborhood
  showNeighborhood({ nodes, edges }) {
    const chart = this.chart;

    // FIXME: not very efficient
    const nonNeighborNodes = chart.selectAll('.node').filter(d => {
      return !nodes.map(node => node.concept).includes(d.concept);
    });
    nonNeighborNodes.style('opacity', OPACITY);

    const nonNeighborEdges = chart.selectAll('.edge').filter(d => !_.some(edges, edge => edge.source === d.data.source && edge.target === d.data.target));
    nonNeighborEdges.style('opacity', OPACITY);
  }
}
