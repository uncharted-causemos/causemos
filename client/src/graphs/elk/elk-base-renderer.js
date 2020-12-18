import _ from 'lodash';
import * as d3 from 'd3';
import ELK from 'elkjs/lib/elk.bundled';

import svgUtil from '@/utils/svg-util';

import { removeChildren } from '@/utils/dom-util';
import { createGraph } from '@/graphs/elk/elk-data';
import GraphRenderer from '@/graphs/graph-renderer';


const pathFn = svgUtil.pathFn.curve(d3.curveBasis);

/**
 * Just make sure the viewport has a min size so it does not look
 * super large if there are only a few elements
 *
 * @param {object} v - viewport {x2, y2, x2, y2} where x2 y2 are width height respectively
 * @param {object} chartSize - { width, height } the effective size of the chart in pixels
 */
const ensureViewportSize = (v, chartSize) => {
  return {
    x1: v.x1,
    y1: v.y1,
    x2: Math.max(v.x2, chartSize.width),
    y2: Math.max(v.y2, chartSize.height)
  };
};

/**
 * Provides base functionalities for doing building graph-based models.
 * Though it has basic rendeing functions, it is meant to be extended and not used directly.
 * Instances that extends this should override
 * - renderNodes
 * - renderEdges
 * - renderEdgeControls
 *
 * The input specification consist of three things
 * - A set of edges and nodes
 * - A configuration that outlines a layout strategy
 * - A set of additional constraints, e.g. Groups
 */
export default class ElkBaseRenderer extends GraphRenderer {
  /**
   * Create Elk graph renderer
   * @param {HTMLElement} options.el - A container element that contains the rendered graph
   *
   * @param {object} options - Elk graph renderer options
   * @param {string} options.strategy - A elk strategy name
   *
   * @param {number] options.nodeWidth - Default node width
   * @param {number] options.nodeHeight - Default node height
   *
   * @param {boolean} options.useEdgeControl - Whether to use edge controls, default to false
   * @param {string} options.edgeControlOffsetType - "percentage" or "unit"
   * @param {numbeer} options.edgeControlOffset - If type is percentage this should be between 0 an 1,
   *     if unit then a positive value is an offset from the source, and a negative offset from the target.
   */
  constructor(options) {
    super();
    this.options = options || {};
    this.options.nodeWidth = this.options.nodeWidth || 30;
    this.options.nodeHeight = this.options.nodeHeight || 30;
    this.options.useEdgeControl = this.options.useEdgeControl || false;
    this.options.edgeControlOffsetType = this.options.edgeControlOffsetType || 'percentage';
    this.options.edgeControlOffset = this.options.edgeControlOffset || 0.66;
    this.options.useDebugger = this.options.useDebugger || false;

    this.parentEl = null;
    this.svgEl = null;

    this.chart = null; // D3 chart reference
    this.chartSize = { width: 1, height: 1 };

    this.constraints = {};
    this.layout = null;

    if (options.el) {
      this.initialize(options.el);
    } else {
      // Throw error
    }

    if (options.strategy) {
      this.setStrategy(options.strategy);
    }

    // Internal trackers
    this.zoom = null;
  }

  /**
   * Initialize the renderer with given container element
   * @param {HTMLElement} element - container element
   */
  initialize(element) {
    this.parentEl = element;
    this.chartSize.width = this.parentEl.clientWidth;
    this.chartSize.height = this.parentEl.clientHeight;

    this.svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    removeChildren(this.parentEl).appendChild(this.svgEl);
    this.svgEl.style.userSelect = 'none';
  }

  /**
   * Set graph data
   * @param {Object} data - a graph model data
   * @param {Object} constraints
   */
  setData(data, constraints) {
    super.setData(data);
    this.constraints = constraints;
    this.layout = null; // clear previous layout since it needs to be updated
  }


  /**
   * Set rendering strategy
   * @param {Object} strategy - An elk rendering strategy
   */
  setStrategy(strategy) {
    super.setStrategy(strategy);
    this.layout = null; // clear previous layout since it needs to be updated
  }

  /**
   * Renders the graph
   */
  async render() {
    const options = this.options;
    if (!this.layout) {
      this.layout = await this.runLayout();
    }

    if (!this.chart) {
      this.chart = this._createChart();
    } else {
      const x1 = 0;
      const y1 = 0;
      const x2 = this.layout.width;
      const y2 = this.layout.height;
      const vp = ensureViewportSize({ x1, y1, x2, y2 }, this.chartSize);
      d3.select(this.svgEl).attr('viewBox', `${vp.x1} ${vp.y1} ${vp.x2} ${vp.y2}`);
    }

    this.buildDefs();
    this.renderNodes();
    this.renderEdges();
    if (options.useEdgeControl) {
      this.renderEdgeControls();
    }

    this._enableDrag();
    if (options.useDebugger) {
      this.renderDebug();
    }


    if (options.useHandles) {
      this.renderHandles();
    }

    this._enableInteraction();
  }

  buildDefs() {
    const svg = d3.select(this.svgEl);
    const edges = this.layout.edges;

    // Clean up
    svg.select('defs').selectAll('.edge-marker-end').remove();

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
      .style('fill', '#000')
      .style('stroke', 'none');
  }

  renderNodes() {
    const chart = this.chart;

    const groupKeyFn = (d) => d.id;
    const nodeKeyFn = (d) => d.id + ':' + d.group;

    // Do group containers
    const groups = chart.selectAll('.container')
      .data(this.layout.groups, groupKeyFn);

    groups.exit().remove();

    const newGroups = groups.enter()
      .append('g')
      .classed('container', true)
      .attr('transform', d => {
        return svgUtil.translate(d.x, d.y);
      });

    newGroups.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .style('stroke', '#000')
      .style('fill', '#CCC');


    chart.selectAll('.container')
      .transition()
      .duration(800)
      .attr('transform', d => svgUtil.translate(d.x, d.y));

    chart.selectAll('.container').select('rect')
      .transition()
      .duration(800)
      .attr('width', d => d.width)
      .attr('height', d => d.height);


    // Build lookup
    const groupLookup = {};
    chart.selectAll('.container').each(function(d) {
      groupLookup[d.id] = d3.select(this);
    });

    const nodes = chart.selectAll('.node')
      .data(this.layout.nodes, nodeKeyFn);

    nodes.exit()
      .select('circle')
      .transition()
      .duration(800)
      .style('opacity', 0)
      .on('end', function() {
        d3.select(this.parentNode).remove();
      });

    nodes.enter().each(function(nodeData) {
      const group = _.isNil(nodeData.group) ? chart : groupLookup[nodeData.group];
      const node = group.append('g')
        .datum(nodeData)
        .classed('node', true)
        .attr('transform', d => {
          return svgUtil.translate(d.x, d.y);
        });
      node.append('circle')
        .attr('cx', d => 0.5 * d.width)
        .attr('cy', d => 0.5 * d.height)
        .attr('r', d => 0.5 * d.width)
        .style('fill', '#369');

      node.append('text')
        .attr('x', 10)
        .attr('y', 20)
        .style('fill', '#EEE')
        .text(d => d.label);
    });

    chart.selectAll('.node')
      .transition()
      .duration(800)
      .attr('transform', d => svgUtil.translate(d.x, d.y));
  }

  renderEdges() {
    const chart = this.chart;

    // FIXME: laxy, should have a transition
    chart.selectAll('.edge').remove();

    const edges = chart.selectAll('.edge')
      .data(this.layout.edges)
      .enter()
      .append('g')
      .classed('edge', true);

    edges
      .append('path')
      .classed('edge-path', true)
      .attr('cursor', 'pointer')
      .attr('d', d => pathFn(d.points))
      .style('fill', 'none')
      .style('stroke', '#000')
      .style('stroke-width', 2)
      .attr('marker-end', d => {
        const source = d.data.source.replace(/\s/g, '');
        const target = d.data.target.replace(/\s/g, '');
        return `url(#arrowhead-${source}-${target})`;
      })
      .attr('marker-start', d => {
        const source = d.data.source.replace(/\s/g, '');
        const target = d.data.target.replace(/\s/g, '');
        return `url(#start-${source}-${target})`;
      });


    d3.selectAll('.edge').style('opacity', 0)
      .transition()
      .duration(1600)
      .style('opacity', 1.0);
  }


  /**
   * Renders a controller UI element along the edge path
   */
  renderEdgeControls() {
    const chart = this.chart;
    const options = this.options;
    const edges = chart.selectAll('.edge');

    // Test: marking 2/3 edge points
    edges.each(function() {
      const pathNode = d3.select(this).select('path').node();

      let pos = 0;
      const total = pathNode.getTotalLength();
      const offset = options.edgeControlOffset;
      if (options.edgeControlOffsetType === 'percentage') {
        pos = offset * total;
      } else {
        pos = offset > 0 ? offset : Math.max(0, (total + offset));
      }

      const controlPoint = pathNode.getPointAtLength(pos);
      d3.select(this).append('g')
        .classed('edge-control', true)
        .attr('transform', svgUtil.translate(controlPoint.x, controlPoint.y))
        .append('circle')
        .attr('r', 2.5)
        .style('stroke', '#888')
        .style('fill', '#8F4')
        .style('cursor', 'pointer');
    });
  }


  /**
   * Debugging information
   */
  renderDebug() {
    const chart = this.chart;
    const background = d3.select(this.svgEl).select('.background-layer');
    const halfW = 0.5 * this.layout.width;
    const halfH = 0.5 * this.layout.height;
    const gridData = [
      [-5000, halfH, 5000, halfH],
      [halfW, -5000, halfW, 5000]
    ];

    background.selectAll('.info').remove();
    const info = background.append('g').classed('info', true);

    const t = d3.zoomTransform(chart.node());
    info.append('text').text('TS: ' + t.k.toFixed(2));
    info.append('text').text('TX: ' + t.x.toFixed(2));
    info.append('text').text('TY: ' + t.y.toFixed(2));
    info.selectAll('text')
      .attr('x', 3)
      .attr('y', (d, i) => (i + 1) * 7)
      .style('font-size', '6px');


    background.selectAll('.grid').remove();
    background.selectAll('.grid')
      .data(gridData)
      .enter()
      .append('path')
      .classed('grid', true)
      .attr('d', d => svgUtil.line(...d))
      .style('fill', 'none')
      .style('stroke', '#00F')
      .style('stroke-width', 1.5)
      .style('opacity', 0.5);
  }

  async runLayout() {
    const options = this.options;
    const graph = createGraph(this.data, {
      nodeSize: { width: options.nodeWidth, height: options.nodeHeight },
      groups: this.constraints.groups || []
    });

    // 1) Apply layout options
    graph.nodes.forEach(n => {
      n.layoutOptions = this.strategy.nodesLayoutOptions(n);
      if (n.ports) {
        n.ports.forEach(p => {
          p.layoutOptions = this.strategy.portsLayoutOptions(n, p);
        });
      }
    });

    // 2) Run the layout algorithm, rawLayout is the hierarchical output which we will
    // flatten later to make node access easier.
    const elk = new ELK();
    const rawLayout = await elk.layout({
      id: this.strategy.id,
      layoutOptions: this.strategy.layoutOptions(this.data),
      edges: graph.edges,
      children: graph.nodes
    });

    // 3) Compensate for relative, absolute positions. Add cache.
    for (const edge of rawLayout.edges) {
      const { startPoint, bendPoints = [], endPoint } = edge.sections[0];
      edge.points = [startPoint, ...bendPoints, endPoint];

      // TODO: This is annoying, edges completely subsumed by a compound node seems to be positioned relative
      // to the compound node itself. We really prefer edges positions to be global and absolute.
      // Are there settings we can tweak to get around this?
      if (this.constraints.groups) {
        this.constraints.groups.forEach(group => {
          const source = edge.data.source;
          const target = edge.data.target;
          const members = group.members;
          if (members.includes(source) && members.includes(target)) {
            const container = rawLayout.children.find(node => node.id === group.id);
            edge.points.forEach(point => {
              point.x += container.x;
              point.y += container.y;
            });
          }
        });
      }

      // perfectly straight edges can be ugly - adding simple points to give the d3 spline function something to work with.
      if (bendPoints.length === 0 && edge.points[0].x < edge.points[1].x && Math.abs(edge.points[0].y - edge.points[1].y) > 10) {
        edge.points.splice(1, 0, ..._.cloneDeep(edge.points));
        edge.points[1].x += 10;
        edge.points[2].x -= 10;
      }

      // Cache initial starting position
      edge.points.forEach(point => {
        point.lastY = point.y;
      });
    }

    // 4) Rearrange the nested data structure to make delta computation easier
    const groups = rawLayout.children.filter(d => d.type === 'container');
    const ungroupedNodes = rawLayout.children.filter(d => d.type === 'node');
    const groupedNodes = _.flatten(groups.map(g => g.children));

    return {
      width: rawLayout.width,
      height: rawLayout.height,
      nodes: [...ungroupedNodes, ...groupedNodes],
      edges: rawLayout.edges,
      groups: groups
    };
  }

  // brings a neighbourhood of nodes temporarily close to a centerNode for user visibility
  bringNodes(centerNode, neighbourhood) {
    const getLayoutNode = concept => this.layout.nodes.filter(node => concept === node.concept)[0];
    neighbourhood.nodes = neighbourhood.nodes.map(node => getLayoutNode(node.concept));

    neighbourhood.nodes.forEach(node => { node.originalXY = [node.x, node.y]; });
    this.layout.edges.forEach(edge => { edge.originalPoints = edge.points; });

    const newNodePositions = neighbourhood.nodes.filter((node) => node !== centerNode).map(node => {
      return {
        node,
        angle: Math.atan2((centerNode.y - node.y), (centerNode.x - node.x)),
        distance: Math.hypot((centerNode.y - node.y), (centerNode.x - node.x))
      };
    });
    newNodePositions.sort((a, b) => a.distance - b.distance);

    const doesCollideWithAny = (nodeA, nodes) => nodes.some(nodeB => {
      return (nodeA !== nodeB &&
              Math.abs(nodeA.x - nodeB.x) * 2 < (nodeA.width + nodeB.width) &&
              Math.abs(nodeA.y - nodeB.y) * 2 < (nodeA.height + nodeB.height));
    });

    const simulate = (node, angle, distance) => {
      return {
        x: node.x - Math.cos(angle) * distance,
        y: node.y - Math.sin(angle) * distance,
        width: node.width,
        height: node.height
      };
    };

    // bring them very close to the centerNode
    newNodePositions.forEach(newNodePosition => {
      Object.assign(newNodePosition.node, simulate(centerNode, newNodePosition.angle, 1));
    });

    // push them back until they stop colliding
    newNodePositions.forEach(newNodePosition => {
      let distance = newNodePosition.node.width;

      while (doesCollideWithAny(newNodePosition.node, neighbourhood.nodes)) {
        const candidatePosition = simulate(centerNode, newNodePosition.angle, distance + 50);
        if (!doesCollideWithAny(candidatePosition, neighbourhood.nodes)) { Object.assign(newNodePosition.node, candidatePosition); }
        distance += 50;
      }
    });

    // update edges
    this.layout.edges.filter(edge => [edge.data.source, edge.data.target].includes(centerNode.concept)).forEach(edge => {
      const sourceNode = getLayoutNode(edge.data.source);
      const targetNode = getLayoutNode(edge.data.target);

      edge.points = [
        { x: sourceNode.x + sourceNode.width, y: sourceNode.y + sourceNode.height / 2 },
        { x: sourceNode.x + sourceNode.width + 10, y: sourceNode.y + sourceNode.height / 2 },
        { x: targetNode.x - 10, y: targetNode.y + targetNode.height / 2 },
        { x: targetNode.x, y: targetNode.y + targetNode.height / 2 }
      ];
    });
  }

  resetNodesPositions() {
    this.layout.nodes.forEach(node => {
      if (node.originalXY) {
        node.x = node.originalXY[0];
        node.y = node.originalXY[1];
        node.originalXY = null;
      }
    });
    this.layout.edges.forEach(edge => {
      if (edge.originalPoints) {
        edge.points = edge.originalPoints;
        edge.originalPoints = null;
      }
    });
  }

  /**
   * applies a transform to the svg move the graph to the center of the svg viewbox
   */
  centerGraphInViewbox() {
    const viewBox = this.svgEl.viewBox.baseVal;
    const centerTranslate = {
      x: (viewBox.width - this.layout.width) / 2,
      y: (viewBox.height - this.layout.height) / 2
    };
    d3.select(this.svgEl).call(this.zoom.transform, d3.zoomIdentity.translate(centerTranslate.x, centerTranslate.y));
  }

  /**
   * Highlight a subgraph with gaussian blur
   *
   * @param {object} options - highlight options
   * @param {string} options.color - highlight color
   * @param {number} options.duration - highlight duration
   */
  highlight({ nodes, edges }, options) {
    const svg = d3.select(this.svgEl);
    const chart = this.chart;

    const color = options.color || 'red';
    const duration = options.duration || 2000;

    // Reset
    svg.select('#glow').remove();

    // Add temporary filter definition
    const filter = svg.select('defs')
      .append('filter')
      .attr('id', 'glow')
      .attr('width', '200%')
      .attr('filterUnits', 'userSpaceOnUse');

    filter.append('feGaussianBlur')
      .attr('stdDeviation', 3.5)
      .attr('result', 'blur');

    filter.append('feOffset')
      .attr('in', 'blur')
      .attr('result', 'offsetBlur')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('x', -10)
      .attr('y', -10);

    filter.append('feFlood')
      .attr('in', 'offsetBlur')
      .attr('flood-color', color)
      .attr('flood-opacity', 0.95)
      .attr('result', 'offsetColor');

    filter.append('feComposite')
      .attr('in', 'offsetColor')
      .attr('in2', 'offsetBlur')
      .attr('operator', 'in')
      .attr('result', 'offsetBlur');


    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode')
      .attr('in', 'offsetBlur');

    feMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic');


    // Apply filter
    // FIXME: not very efficient
    const hNodes = chart.selectAll('.node').filter(d => { return nodes.includes(d.concept); });
    hNodes.style('filter', 'url(#glow)');

    const hEdges = chart.selectAll('.edge').filter(d => { return _.some(edges, edge => edge.source === d.data.source && edge.target === d.data.target); });
    hEdges.style('filter', 'url(#glow)');

    svg.select('#glow').select('feGaussianBlur')
      .transition()
      .duration(duration)
      .attr('stdDeviation', 0)
      .on('end', () => {
        hNodes.style('filter', null);
        hEdges.style('filter', null);
      });
  }

  /**
   * Move to node
   *
   * @param {string} nodeId - id
   * @param {number} duration - animation transition time in millis
   *
   * See: https://observablehq.com/@d3/programmatic-zoom
   */
  moveTo(nodeId, duration) {
    const chart = this.chart;
    const svg = d3.select(this.svgEl);
    const width = this.layout.width;
    const height = this.layout.height;

    // t.k = scale, t.x = translateX, t.y = translateY
    const t = d3.zoomTransform(chart.node());

    const node = this.layout.nodes.find(n => n.id === nodeId);
    if (_.isNil(node)) return;

    let dx = node.x + 0.5 * node.width;
    let dy = node.y + 0.5 * node.height;
    if (!_.isNil(node.group)) {
      const group = this.layout.groups.find(g => g.id === node.group);
      dx += group.x;
      dy += group.y;
    }

    svg.transition().duration(duration).call(
      this.zoom.transform,
      d3.zoomIdentity.translate(0, 0).scale(t.k).translate(
        -dx + (0.5 * width) / t.k,
        -dy + (0.5 * height) / t.k
      )
    );
  }




  /**
   * Prepare the SVG and returns a chart refrence. This function will create three "layers": background,
   * data, and foreground layers. The data-layer corresponds to the chart.
   */
  _createChart() {
    const { width, height } = this.chartSize;
    const viewPort = {
      x1: 0,
      y1: 0,
      x2: this.layout.width,
      y2: this.layout.height
    };
    const svg = d3.select(this.svgEl);
    svg.selectAll('*').remove();

    const treatedSVG = svgUtil.createChart(svg, width, height, ensureViewportSize(viewPort, this.chartSize));

    // change to xMinyMin
    treatedSVG.attr('preserveAspectRatio', 'xMidYMid meet');

    // Add a debugging/background layer
    treatedSVG.append('g').classed('background-layer', true);

    // Add chart group
    const chart = treatedSVG.append('g').classed('data-layer', true);

    // Add a foreground layer
    treatedSVG.append('g').classed('foreground-layer', true);

    const _this = this;
    function zoomed(evt) {
      chart.attr('transform', evt.transform);
      if (_this.options.useDebugger) {
        _this.renderDebug();
      }
    }
    this.zoom = d3.zoom().scaleExtent([0.5, 5]).on('zoom', zoomed);
    svg.call(this.zoom).on('dblclick.zoom', null);
    return chart;
  }

  /**
   * Standard interaction hooks, these are essentially callback functions
   * that takes in two parameters: A d3 selection of the element, and a
   * reference to the renderer.
   */
  _enableInteraction() {
    const chart = this.chart;
    const self = this;
    const registry = this.registry;
    const svg = d3.select(this.svgEl);
    const nodes = chart.selectAll('.node');
    const edges = chart.selectAll('.edge');

    const registered = (eventName) => {
      return ({}.hasOwnProperty.call(registry, eventName));
    };

    svg.on('click', function (evt) {
      evt.stopPropagation();
      const pointerCoords = d3.zoomTransform(svg.node()).invert(d3.pointer(evt));
      if (registered('backgroundClick')) {
        registry.backgroundClick(evt, d3.select(this), self, {
          x: pointerCoords[0],
          y: pointerCoords[1]
        });
      }
    });

    svg.on('dblclick', function (evt) {
      evt.stopPropagation();
      const pointerCoords = d3.zoomTransform(svg.node()).invert(d3.pointer(evt));
      if (registered('backgroundDblClick')) {
        registry.backgroundDblClick(evt, d3.select(this), self, {
          x: pointerCoords[0],
          y: pointerCoords[1]
        });
      }
    });

    nodes.on('click', function(evt) {
      evt.stopPropagation();
      if (registered('nodeClick')) {
        registry.nodeClick(evt, d3.select(this), self);
      }
    });

    nodes.on('dblclick', function(evt) {
      evt.stopPropagation();
      if (registered('nodeDblClick')) {
        registry.nodeDblClick(evt, d3.select(this), self);
      }
    });

    nodes.on('mouseenter', function(evt) {
      evt.stopPropagation();
      if (registered('nodeMouseEnter')) {
        registry.nodeMouseEnter(evt, d3.select(this), self);
      }
    });

    nodes.on('mouseleave', function(evt) {
      evt.stopPropagation();
      if (registered('nodeMouseLeave')) {
        registry.nodeMouseLeave(evt, d3.select(this), self);
      }
    });

    edges.on('click', function(evt) {
      evt.stopPropagation();
      if (registered('edgeClick')) {
        registry.edgeClick(evt, d3.select(this), self);
      }
    });

    edges.on('mouseenter', function(evt) {
      evt.stopPropagation();
      if (registered('edgeMouseEnter')) {
        registry.edgeMouseEnter(evt, d3.select(this), self);
      }
    });

    edges.on('mouseleave', function(evt) {
      evt.stopPropagation();
      if (registered('edgeMouseLeave')) {
        registry.edgeMouseLeave(evt, d3.select(this), self);
      }
    });
  }

  /**
   * Enable node dragging, this will recalculate edge end points as well
   */
  _enableDrag() {
    const chart = this.chart;
    const options = this.options;
    const data = this.layout;
    const nodes = chart.selectAll('.node');
    const containers = chart.selectAll('.container');

    // FIXME: Edge control configurations are hardcoded, can we generalize it so sub-classes do not need to
    // reimplement enableDrag() ?
    function updateEdges() {
      chart.selectAll('.edge').selectAll('path').attr('d', d => {
        return pathFn(d.points);
      });
      if (options.useEdgeControl) {
        chart.selectAll('.edge').each(function() {
          const pathNode = d3.select(this).select('path').node();
          const edgeControl = d3.select(this).select('.edge-control');
          if (edgeControl.node() === null) return;

          const translate = svgUtil.getTranslateFromSVGTransform(edgeControl.node().transform);
          const controlPoint = svgUtil.closestPointOnPath(pathNode, translate);
          edgeControl.attr('transform', svgUtil.translate(controlPoint[0], controlPoint[1]));
        });
      }
    }

    function dragStart(evt) {
      evt.sourceEvent.stopPropagation();
    }

    function containerDragMove(evt) {
      const node = d3.select(this);

      // Adjust node
      const dx = evt.dx;
      const dy = evt.dy;
      node.datum().x += dx;
      node.datum().y += dy;
      node.attr('transform', svgUtil.translate(node.datum().x, node.datum().y));

      const members = node.datum().children.map(d => d.id);

      // Adjust edge
      data.edges.forEach(edge => {
        const source = edge.data.source;
        const target = edge.data.target;

        if (members.includes(source) && members.includes(target)) {
          edge.points.forEach(p => {
            p.x += dx;
            p.y += dy;
            p.lastY = p.y;
          });
        } else if (members.includes(source)) {
          edge.points[0].x += dx;
          edge.points[0].y += dy;
          edge.points[0].lastY = edge.points[0].y;
        } else if (members.includes(target)) {
          edge.points[edge.points.length - 1].x += dx;
          edge.points[edge.points.length - 1].y += dy;
          edge.points[edge.points.length - 1].lastY = edge.points[edge.points.length - 1].y;
        }
      });

      // update edges based on new source/target coords
      updateEdges();
    }

    function dragMove(evt) {
      const node = d3.select(this);

      // Check if there is a parent container
      const parentData = d3.select(this.parentNode).datum();

      // Adjust node
      const dx = evt.dx;
      const dy = evt.dy;

      // Short circuit
      if (parentData) {
        if (node.datum().x + node.datum().width + dx > (parentData.width) || node.datum().x + dx < 0) {
          return;
        }
        if (node.datum().y + node.datum().height + dy > (parentData.height) || node.datum().y + dy < 0) {
          return;
        }
      }

      node.datum().x += dx;
      node.datum().y += dy;
      node.attr('transform', svgUtil.translate(node.datum().x, node.datum().y));
      // Adjust edge
      data.edges.forEach(edge => {
        const source = _.first(edge.sources[0].split(':'));
        const target = _.first(edge.targets[0].split(':'));

        // if there's originalPoints, moving the edge now will disconnect edge/node when it returns to the originalPoints later
        if (edge.originalPoints != null) return;

        if (source === node.datum().concept && target === node.datum().concept) {
          edge.points.forEach(p => {
            p.x += dx;
            p.y += dy;
            p.lastY = p.y;
          });
        } else if (source === node.datum().concept) {
          edge.points[0].x += dx;
          edge.points[0].y += dy;
          edge.points[0].lastY = edge.points[0].y;
        } else if (target === node.datum().concept) {
          edge.points[edge.points.length - 1].x += dx;
          edge.points[edge.points.length - 1].y += dy;
          edge.points[edge.points.length - 1].lastY = edge.points[edge.points.length - 1].y;
        }
      });

      // update edges based on new source/target coords
      updateEdges();
    }

    function dragEnd() {
    }

    // FIXME: Need to disable current listeners first before assigning new ones?
    const nodeDrag = d3.drag()
      .on('start', dragStart)
      .on('end', dragEnd)
      .on('drag', dragMove);
    nodes.call(nodeDrag);

    const containerDrag = d3.drag()
      .on('start', dragStart)
      .on('end', dragEnd)
      .on('drag', containerDragMove);
    containers.call(containerDrag);
  }

  /**
   * Given a node identifier, trace up the ancestor chain and record edges along the way
   *
   * @param {string} id - node identifier
   */
  _trace(nodeId) {
    const checked = {};
    const data = this.layout || { edges: [] };
    const tracedEdges = [];

    function backtrack(id) {
      if ({}.hasOwnProperty.call(checked, id)) return;
      checked[id] = 1;

      const edges = data.edges.filter(edge => edge.data.target === id);
      edges.forEach(edge => {
        tracedEdges.push(edge);
        backtrack(edge.data.source);
      });
    }
    backtrack(nodeId, [nodeId]);

    return {
      edges: tracedEdges.map(edge => {
        return { source: edge.data.source, target: edge.data.target };
      }),
      nodes: _.uniq([...tracedEdges.map(e => e.data.source), ...tracedEdges.map(e => e.data.target)])
    };
  }
}
