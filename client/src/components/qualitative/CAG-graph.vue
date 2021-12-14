<template>
  <div class="CAG-graph-container">
    <div
      ref="container"
      class="CAG-graph"
    />
    <graph-search
      :nodes="data.nodes"
      @search="search"
    />
    <new-node-concept-select
      v-if="showNewNode"
      ref="newNode"
      :concepts-in-cag="conceptsInCag"
      :placement="{ x: newNodeX, y: newNodeY }"
      @suggestion-selected="onSuggestionSelected"
      @show-custom-concept="showCustomConcept = true"
    />
    <modal-custom-concept
      v-if="showCustomConcept"
      ref="customGrounding"
      @close="showCustomConcept = false"
      @save-custom-concept="saveCustomConcept"
    />
  </div>
</template>

<script>
import _ from 'lodash';
import moment from 'moment';
import * as d3 from 'd3';
import { mapActions } from 'vuex';
import { interpolatePath } from 'd3-interpolate-path';
import Mousetrap from 'mousetrap';

import { highlight, nodeDrag, panZoom, getAStarPath, simplifyPath } from 'svg-flowgraph';
import BaseCAGRenderer from '@/graphs/base-cag-renderer';
import Adapter from '@/graphs/elk/adapter';
import { layered } from '@/graphs/elk/layouts';
import svgUtil from '@/utils/svg-util';
import { nodeBlurScale, calcEdgeColor, scaleByWeight } from '@/utils/scales-util';
import { calculateNeighborhood, hasBackingEvidence, highlightOptions, overlap } from '@/utils/graphs-util';
import NewNodeConceptSelect from '@/components/qualitative/new-node-concept-select';
import { SELECTED_COLOR, UNDEFINED_COLOR } from '@/utils/colors-util';
import ModalCustomConcept from '@/components/modals/modal-custom-concept.vue';
import GraphSearch from '@/components/widgets/graph-search.vue';

import projectService from '@/services/project-service';

const pathFn = svgUtil.pathFn.curve(d3.curveBasis);
const targetNodeSelector = 'rect';
const mergeNodeColor = 'rgb(136, 255, 136)';

const tweenEdgeAndNodes = false; // Flag to turn on/off path animation

const DEFAULT_STYLE = {
  edge: {
    fill: 'none',
    strokeWidth: 5,
    controlRadius: 6,
    strokeDash: '3,2'
  },
  edgeBg: {
    fill: 'none',
    stroke: '#F2F2F2'
  },
  nodeHeader: {
    iconRadius: 6,
    fill: '#FFFFFF',
    stroke: '#999',
    strokeWidth: 0.5,
    borderRadius: 4,
    highlighted: {
      stroke: '#60B5E2',
      borderRadius: 4,
      strokeWidth: 2
    }
  },
  nodeHandles: {
    width: 15
  }
};

const FADED_OPACITY = 0.2;
// const GRAPH_HEIGHT = 40;
const THRESHOLD_TIME = 1;

let temporaryNewEdge = null;
let handleBeingDragged = false;

class CAGRenderer extends BaseCAGRenderer {
  renderNodeAdded(nodeSelection) {
    nodeSelection.append('g').classed('node-handles', true);
    nodeSelection.append('rect')
      .classed('node-header', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', DEFAULT_STYLE.nodeHeader.borderRadius)
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .style('stroke', DEFAULT_STYLE.nodeHeader.stroke)
      .style('stroke-width', DEFAULT_STYLE.nodeHeader.strokeWidth)
      .style('cursor', 'pointer')
      .style('fill', DEFAULT_STYLE.nodeHeader.fill);

    nodeSelection
      .append('text')
      .classed('node-label', true)
      .attr('x', 10)
      .attr('y', 20)
      .style('pointer-events', 'none')
      .text(d => d.label)
      .each(function () { svgUtil.truncateTextToWidth(this, d3.select(this).datum().width - 20); });
  }

  // Override render function to also check for ambigous edges and highlight them
  async render() {
    await super.render();
    this.displayGraphStats();
  }

  renderNodeUpdated(nodeSelection) {
    nodeSelection.selectAll('.node-label')
      .text(d => d.label)
      .each(function () { svgUtil.truncateTextToWidth(this, d3.select(this).datum().width - 20); });
  }

  renderNodeRemoved(selection) {
    selection.selectAll('rect').style('fill', '#E88');
    selection
      .transition()
      .duration(1000)
      .style('opacity', 0)
      .on('end', function() {
        d3.select(this.parentNode).remove();
      });
  }

  buildDefs() {
    const svg = d3.select(this.svgEl);
    const nodes = this.layout.nodes;
    const edges = this.layout.edges;

    const rangedNodeBlurScale = nodeBlurScale.range([5, 0]);

    // Clean up
    svg.select('defs').selectAll('.edge-marker-end').remove();
    svg.select('defs').selectAll('.edge-marker-start').remove();
    svg.select('defs').selectAll('.node-blur').remove();

    // Arrow defs
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
      .attr('viewBox', svgUtil.MARKER_VIEWBOX)
      .attr('markerUnits', 'userSpaceOnUse')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .append('svg:circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 4)
      .style('fill', d => calcEdgeColor(d.data))
      .style('stroke', '#FFF');

    // Node defs
    svg.select('defs')
      .selectAll('.node-blur')
      .data(nodes || [])
      .enter()
      .append('filter')
      .classed('node-blur', true)
      .attr('id', d => `blur-${d.id}`)
      .append('feGaussianBlur')
      .attr('stdDeviation', d => rangedNodeBlurScale(d.data.grounding_score));

    // Node defs
    svg.select('defs')
      .append('marker')
      .attr('id', 'arrowhead')
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
      .style('fill', '#444')
      .style('stroke', 'none');
  }

  renderEdgeAdded(selection, renderer) {
    // If we manually drew a new edge, we need to inject the path points back in, as positions are not stored.
    if (temporaryNewEdge) {
      const sourceNode = temporaryNewEdge.sourceNode;
      const targetNode = temporaryNewEdge.targetNode;
      const edge = renderer.layout.edges.find(d => d.source === sourceNode.concept && d.target === targetNode.concept);
      if (edge) {
        edge.points = renderer.getPathBetweenNodes(sourceNode, targetNode);
      }
      temporaryNewEdge = null;
    }

    selection
      .append('path')
      .classed('edge-path-bg', true)
      .style('fill', DEFAULT_STYLE.edgeBg.fill)
      .style('stroke', DEFAULT_STYLE.edgeBg.stroke)
      .style('stroke-width', d => scaleByWeight(DEFAULT_STYLE.edge.strokeWidth, d.data) + 2)
      .attr('d', d => pathFn(d.points));

    selection
      .append('path')
      .classed('edge-path', true)
      .style('fill', DEFAULT_STYLE.edge.fill)
      .attr('d', d => pathFn(d.points))
      .style('stroke-width', d => scaleByWeight(DEFAULT_STYLE.edge.strokeWidth, d.data))
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
      });
  }

  renderEdgeUpdated(selection) {
    selection
      .select('.edge-path')
      .style('stroke', d => calcEdgeColor(d.data))
      .style('stroke-width', d => scaleByWeight(DEFAULT_STYLE.edge.strokeWidth, d.data))
      .style('stroke-dasharray', d => hasBackingEvidence(d.data) ? null : DEFAULT_STYLE.edge.strokeDash);

    if (tweenEdgeAndNodes === true) {
      selection
        .select('.edge-path')
        .transition()
        .duration(1000)
        .attrTween('d', function (d) {
          const currentPath = pathFn(d.points);
          const previousPath = d3.select(this).attr('d') || currentPath;
          const interPath = interpolatePath(previousPath, currentPath);
          return (t) => {
            return interPath(t);
          };
        });
      selection
        .select('.edge-path-bg')
        .transition()
        .duration(1000)
        .attrTween('d', function (d) {
          const currentPath = pathFn(d.points);
          const previousPath = d3.select(this).attr('d') || currentPath;
          const interPath = interpolatePath(previousPath, currentPath);
          return (t) => {
            return interPath(t);
          };
        });
    } else {
      selection
        .select('.edge-path')
        .attr('d', d => {
          return pathFn(d.points);
        });
      selection
        .select('.edge-path-bg')
        .attr('d', d => {
          return pathFn(d.points);
        });
    }
  }

  renderEdgeRemoved(selection) {
    selection
      .transition()
      .duration(1000)
      .style('opacity', 0)
      .remove();
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
          const translate = svgUtil.getTranslateFromSVGTransform(this.transform);
          const pathNode = d3.select(this.parentNode).select('.edge-path').node();
          const controlPoint = svgUtil.closestPointOnPath(pathNode, translate);
          return svgUtil.translate(controlPoint[0], controlPoint[1]);
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

    const controlStyles = svgUtil.POLARITY_ICON_SVG_SETTINGS;

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

  resetDragState() {
    const chart = this.chart;
    chart.selectAll('.new-edge').remove();
    this.newEdgeSource = null;
    this.newEdgeTarget = null;
  }

  disableNodeHandles() {
    const chart = this.chart;
    const nodes = chart.selectAll('.node');

    nodes.select('.node-header')
      .attr('width', (d) => d.width)
      .attr('x', 0);

    nodes.select('.node-header:not(.node-selected)')
      .style('stroke', DEFAULT_STYLE.nodeHeader.stroke)
      .style('stroke-width', DEFAULT_STYLE.nodeHeader.strokeWidth);

    nodes.select('path')
      .attr('transform', svgUtil.translate(DEFAULT_STYLE.nodeHandles.width, DEFAULT_STYLE.nodeHandles.width));

    nodes.select('.node-label')
      .attr('x', 10)
      .text(d => d.label)
      .each(function () { svgUtil.truncateTextToWidth(this, d3.select(this).datum().width - 20); });

    this.chart.selectAll('.node-handles').selectAll('*').remove();
  }

  getNodeCollider() {
    // TODO: this won't work with hierarchies
    return (p) => this.layout.nodes.some(n => p.x > n.x && p.x < n.x + n.width && p.y > n.y && p.y < n.y + n.height);
  }

  enableNodeHandles(node) {
    const chart = this.chart;
    const svg = d3.select(this.svgEl);
    const nodeData = node.datum();
    const handles = node.select('.node-handles').append('g');

    node.select('.node-header')
      .attr('width', (d) => d.width - DEFAULT_STYLE.nodeHandles.width * 2)
      .attr('x', DEFAULT_STYLE.nodeHandles.width)
      .style('border-radius', DEFAULT_STYLE.nodeHeader.highlighted.borderRadius)
      .style('stroke', DEFAULT_STYLE.nodeHeader.highlighted.stroke)
      .style('stroke-width', DEFAULT_STYLE.nodeHeader.highlighted.strokeWidth);

    node.select('path')
      .attr('transform', svgUtil.translate(DEFAULT_STYLE.nodeHandles.width * 2, DEFAULT_STYLE.nodeHandles.width));

    node.select('.node-label')
      .attr('x', 30)
      .text(d => d.label)
      .each(function () { svgUtil.truncateTextToWidth(this, d3.select(this).datum().width - 50); });

    handles.append('rect')
      .classed('handle', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('width', nodeData.width)
      .attr('height', nodeData.height)
      .style('cursor', 'pointer')
      .style('fill', '#4E4F51');

    handles.append('text')
      .attr('x', DEFAULT_STYLE.nodeHandles.width * 0.2)
      .attr('y', nodeData.height * 0.625)
      .style('font-family', 'FontAwesome')
      .style('font-size', '12px')
      .style('stroke', 'none')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text('\uf061');

    handles.append('text')
      .attr('x', nodeData.width - DEFAULT_STYLE.nodeHandles.width * 0.85)
      .attr('y', nodeData.height * 0.625)
      .style('font-family', 'FontAwesome')
      .style('font-size', '12px')
      .style('stroke', 'none')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text('\uf061');
    const getLayoutNodeById = id => this.layout.nodes.find(n => n.id === id);
    const getNodeExit = (node, offset = 0) => ({ x: node.x + node.width + offset, y: node.y + 0.5 * node.height });
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const drag = d3.drag()
      .on('start', async (evt) => {
        this.newEdgeSourceId = evt.subject.id; // Refers to datum, use id because layout position can change
        const graph = evt.subject.parent.data; // FIXME - we should avoid this kind of data access, we should probably pass projectID into the renderer directly

        // Begin processing to highlight nodes that have evidence for an edge originating from the source
        const sourceNode = getLayoutNodeById(this.newEdgeSourceId);
        const project_id = graph.project_id;
        const nodesInGraph = graph.nodes;

        const edges = graph.edges;
        const nodesToCheck = nodesInGraph
          .filter(node => node.components)
          .filter(node => {
            return !_.some(edges, edge => edge.source === sourceNode.concept && edge.target === node.concept);
          });
        const componentsInGraph = _.uniq(_.flatten(nodesToCheck.map(node => node.components)));

        const svg = this.svgEl;
        const foregroundLayer = d3.select(svg).select('.data-layer');

        const filters = {
          clauses: [
            { field: 'subjConcept', values: sourceNode.data.components, isNot: false, operand: 'or' },
            { field: 'objConcept', values: componentsInGraph, isNot: false, operand: 'or' }]
        };

        // Get the edges, then reverse-map the edges back into containers
        projectService.getProjectGraph(project_id, filters).then(d => {
          // Contains all possible edges in the knowledge-base originating from the source
          const resultEdges = d.edges;

          resultEdges.forEach(edge => {
            const nodes = nodesToCheck.filter(n => n.components.includes(edge.target));

            nodes.forEach(nodeData => {
              const targetNode = getLayoutNodeById(nodeData.concept);

              const pointerX = targetNode.x;
              const pointerY = targetNode.y + (targetNode.height * 0.5);
              foregroundLayer
                .append('svg:path')
                .attr('d', svgUtil.ARROW)
                .classed('edge-possibility-indicator', true)
                .attr('transform', `translate(${pointerX}, ${pointerY}) scale(1.8)`)
                .attr('fill', calcEdgeColor(edge))
                .attr('opactiy', 0)
                .style('pointer-events', 'none')
                .transition()
                .duration(300)
                .attr('opacity', 1);
            });
          });
        });

        // mark dragging flag
        handleBeingDragged = true;
      })
      .on('drag', (evt) => {
        chart.selectAll('.new-edge').remove();
        const pointerCoords = d3.zoomTransform(svg.node()).invert(d3.pointer(evt, svg.node()));
        chart.append('path')
          .classed('new-edge', true)
          .attr('d', () => {
            const newEdgeSource = getLayoutNodeById(evt.subject.id);
            const newEdgeStart = getNodeExit(newEdgeSource);
            const mousePoint = { x: pointerCoords[0], y: pointerCoords[1] };

            if (d3.select(evt.sourceEvent.target).classed('node-header') || d3.select(evt.sourceEvent.target).classed('handle')) {
              this.newEdgeTargetId = d3.select(evt.sourceEvent.target).datum().id;

              if (this.newEdgeSourceId === this.newEdgeTargetId && distance(newEdgeStart, mousePoint) < 20) {
                this.newEdgeTargetId = null;
                return pathFn([]);
              }
              return pathFn(this.getPathBetweenNodes(newEdgeSource, getLayoutNodeById(this.newEdgeTargetId)));
            } else {
              this.newEdgeTargetId = null;
              return pathFn(simplifyPath(getAStarPath(newEdgeStart, mousePoint, this.getNodeCollider())));
            }
          })
          .style('pointer-events', 'none')
          .style('stroke', UNDEFINED_COLOR)
          .attr('marker-end', 'url(#arrowhead)')
          .style('stroke-dasharray', DEFAULT_STYLE.edge.strokeDash)
          .style('stroke-width', DEFAULT_STYLE.edge.strokeWidth)
          .style('fill', 'none');
      })
      .on('end', () => {
        const sourceNode = getLayoutNodeById(this.newEdgeSourceId);
        const targetNode = getLayoutNodeById(this.newEdgeTargetId);

        this.disableNodeHandles();
        this.resetDragState();

        // remove edge indicators
        const indicators = d3.selectAll('.edge-possibility-indicator');
        indicators
          .transition()
          .duration(300)
          .style('opacity', 0)
          .remove();

        if (_.isNil(sourceNode) || _.isNil(targetNode)) return;
        temporaryNewEdge = { sourceNode, targetNode };

        this.options.newEdgeFn(sourceNode.data, targetNode.data);

        handleBeingDragged = false;
      });
    handles.call(drag);
  }

  getPathBetweenNodes(source, target) {
    const getNodeEntrance = (node, offset = 0) => ({ x: node.x + offset, y: node.y + 0.5 * node.height });
    const getNodeExit = (node, offset = 0) => ({ x: node.x + node.width + offset, y: node.y + 0.5 * node.height });

    return [].concat(
      [getNodeExit(source)],
      simplifyPath(getAStarPath(getNodeExit(source, 5), getNodeEntrance(target, -5), this.getNodeCollider())),
      [getNodeEntrance(target)]
    );
  }

  hideNeighbourhood() {
    const chart = this.chart;
    chart.selectAll('.node').style('opacity', 1);
    chart.selectAll('.edge').style('opacity', 1);
    chart.selectAll('.node-header').classed('node-selected', false);
    chart.selectAll('.edge-control').remove();
  }

  // Highlights the neighborhood
  showNeighborhood({ nodes, edges }) {
    const chart = this.chart;

    // FIXME: not very efficient
    const nonNeighborNodes = chart.selectAll('.node').filter(d => {
      return !nodes.map(node => node.concept).includes(d.concept);
    });
    nonNeighborNodes.style('opacity', FADED_OPACITY);

    const nonNeighborEdges = chart.selectAll('.edge').filter(d => !_.some(edges, edge => edge.source === d.data.source && edge.target === d.data.target));
    nonNeighborEdges.style('opacity', FADED_OPACITY);
  }

  selectEdge(evt, edge) {
    const mousePoint = d3.pointer(evt, edge.node());
    const pathNode = edge.select('.edge-path').node();
    const controlPoint = svgUtil.closestPointOnPath(pathNode, mousePoint);

    edge.append('g')
      .classed('edge-control', true)
      .attr('transform', svgUtil.translate(controlPoint[0], controlPoint[1]));

    this.renderEdgeControls();
  }

  selectNode(node) {
    node.select('.node-header')
      .style('border-radius', DEFAULT_STYLE.nodeHeader.highlighted.borderRadius)
      .style('stroke', DEFAULT_STYLE.nodeHeader.highlighted.stroke)
      .style('stroke-width', DEFAULT_STYLE.nodeHeader.highlighted.strokeWidth);
  }

  clearSelections() {
    const chart = this.chart;
    chart.selectAll('.node-header') // Clean up previous highlights
      .style('border-radius', DEFAULT_STYLE.nodeHeader.borderRadius)
      .style('stroke', DEFAULT_STYLE.nodeHeader.stroke)
      .style('stroke-width', DEFAULT_STYLE.nodeHeader.strokeWidth);
  }

  /**
   * Used for creating new CAG node and retain existing xy-position.
   * We are building a blueprint, so the next iteration, when we have actual
   * data we can bind to it without losing prior position placements
   */
  createNewNode(x, y, { concept, label }) {
    const chart = this.chart;
    const node = chart.select('.nodes-layer').append('g').classed('node', true).attr('transform', svgUtil.translate(x, y));

    node.datum({
      id: concept,
      concept: concept,
      label: label,
      x: x,
      y: y,
      height: 30,
      width: 130,
      type: 'normal',
      data: { components: [] },
      nodes: []
    });

    const nodeUI = node.append('g').classed('node-ui', true);

    this.renderNodeAdded(nodeUI);
    nodeUI.call(this.enableNodeInteraction, this);
  }
}


export default {
  name: 'CAGGraph',
  components: {
    NewNodeConceptSelect,
    ModalCustomConcept,
    GraphSearch
  },
  props: {
    data: {
      type: Object,
      default: () => ({ })
    },
    showNewNode: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'delete', 'refresh',
    'new-edge', 'node-click', 'edge-click', 'background-click', 'background-dbl-click',
    'rename-node',
    'merge-nodes',
    'suggestion-selected', 'suggestion-duplicated'
  ],
  data: () => ({
    selectedNode: '',
    newNodeX: 0,
    newNodeY: 0,
    svgX: 0,
    svgY: 0,
    showCustomConcept: false,
    targetNode: null
  }),
  computed: {
    conceptsInCag() {
      return this.data.nodes.map(node => node.concept);
    }
  },
  watch: {
    data() {
      this.refresh();
    },
    showNewNode(newValue) {
      if (newValue) {
        this.$nextTick(() => {
          // Wait a tick for NewNodeConceptSelect to be shown, then focus it
          this.focusNewNodeInput();
        });
      } else {
        this.newNodeX = 20;
        this.newNodeY = 20;
      }
    }
  },
  created() {
    // renderer is intentionally left out of `data` to avoid
    //  making it deeply reactive, since it contains a very
    //  large tree of references
    this.renderer = null;
  },
  mounted() {
    this.renderer = new CAGRenderer({
      el: this.$refs.container,
      adapter: new Adapter({ nodeWidth: 130, nodeHeight: 30, layout: layered }),
      renderMode: 'delta',
      addons: [highlight, nodeDrag, panZoom],
      useEdgeControl: true,
      useStableLayout: true,
      useStableZoomPan: true,
      newEdgeFn: (source, target) => {
        this.$emit('new-edge', { source, target });
      },
      renameFn: (node) => {
        this.$emit('rename-node', node);
      },
      deleteFn: (node) => {
        this.selectedNode = node;
        this.$emit('delete', node.datum());
      }
    });

    this.mouseTrap = new Mousetrap(document);
    this.mouseTrap.bind(['backspace', 'del'], () => {
      this.$emit('delete');
    });

    this.renderer.setCallback('backgroundClick', () => {
      this.$emit('background-click');
      this.deselectNodeAndEdge();
    });

    this.renderer.setCallback('backgroundDblClick', (evt, _target, _renderer, coord) => {
      this.newNodeX = evt.offsetX;
      this.newNodeY = evt.offsetY;
      this.svgX = coord.x;
      this.svgY = coord.y;
      this.$emit('background-dbl-click');
    });

    this.renderer.setCallback('nodeClick', (_evt, node) => {
      const concept = node.datum().concept;
      const neighborhood = calculateNeighborhood(this.data, concept);

      this.deselectNodeAndEdge();
      this.renderer.showNeighborhood(neighborhood);
      node.select('.node-header').classed('node-selected', true);
      this.selectedNode = concept;
      this.renderer.selectNode(node);

      const payload = node.datum();
      this.$emit('node-click', payload);
    });

    this.renderer.setCallback('edgeClick', (evt, edge) => {
      const source = edge.datum().data.source;
      const target = edge.datum().data.target;
      this.$emit('edge-click', edge.datum().data);
      const neighborhood = { nodes: [{ concept: source }, { concept: target }], edges: [{ source, target }] };

      this.deselectNodeAndEdge();
      this.renderer.showNeighborhood(neighborhood);
      this.renderer.selectEdge(evt, edge);
    });

    this.renderer.setCallback('nodeMouseEnter', (_evt, node, renderer) => {
      if (node.datum().nodes) return;
      if (_.isNil(renderer.newEdgeSource)) renderer.enableNodeHandles(node);
      const data = node.datum();
      if (data.label !== node.select('.node-label').text()) {
        svgUtil.showSvgTooltip(renderer.chart, data.label, [data.x + data.width / 2, data.y]);
      }

      if (handleBeingDragged === true) return;

      const H = node.datum().height;
      const control = node.append('g')
        .classed('node-control', true);

      control.append('rect')
        .attr('x', 0)
        .attr('y', H)
        .attr('width', 130)
        .attr('height', 30)
        .style('fill', 'transparent');

      control.append('rect')
        .attr('x', 0)
        .attr('y', H + 4)
        .attr('width', 60)
        .attr('height', 20)
        .attr('rx', 2)
        .attr('ry', 2)
        .style('stroke', '#333')
        .style('fill', '#333')
        .style('opacity', 0.80)
        .style('cursor', 'pointer')
        .on('mouseenter', function() {
          d3.select(this).style('opacity', 1.0);
        })
        .on('mouseleave', function() {
          d3.select(this).style('opacity', 0.80);
        })
        .on('click', (evt, node) => {
          renderer.options.renameFn(node.data);
          evt.stopPropagation();
        });

      control.append('text')
        .attr('x', 4)
        .attr('y', H + 4 + 15)
        .style('fill', '#eee')
        .text('Rename')
        .style('pointer-events', 'none');

      control.append('rect')
        .attr('x', 70)
        .attr('y', H + 4)
        .attr('width', 60)
        .attr('height', 20)
        .attr('rx', 2)
        .attr('ry', 2)
        .style('stroke', '#E11')
        .style('fill', '#E11')
        .style('opacity', 0.80)
        .style('cursor', 'pointer')
        .on('mouseenter', function() {
          d3.select(this).style('opacity', 1.0);
        })
        .on('mouseleave', function() {
          d3.select(this).style('opacity', 0.80);
        })
        .on('click', (evt) => {
          renderer.options.deleteFn(node);
          evt.stopPropagation();
        });

      control.append('text')
        .attr('x', 74)
        .attr('y', H + 4 + 15)
        .style('fill', '#eee')
        .text('Delete')
        .style('pointer-events', 'none');
    });

    this.renderer.setCallback('nodeMouseLeave', (_evt, node, renderer) => {
      if (node.datum().nodes) return;
      if (_.isNil(renderer.newEdgeSource)) renderer.disableNodeHandles();

      if (!_.isEmpty(this.selectedNode)) {
        const chart = this.renderer.chart;
        const node = chart.selectAll('.node').filter(n => n.concept === this.selectedNode);
        renderer.selectNode(node);
      }
      svgUtil.hideSvgTooltip(renderer.chart);

      node.select('.node-control').remove();
    });

    this.renderer.setCallback('edgeMouseEnter', (evt, edge) => {
      edge.selectAll('.edge-mouseover-handle').remove();

      const mousePoint = d3.pointer(evt, edge.node());
      const pathNode = edge.select('.edge-path').node();
      const controlPoint = svgUtil.closestPointOnPath(pathNode, mousePoint);

      edge.append('g')
        .classed('edge-mouseover-handle', true)
        .attr('transform', svgUtil.translate(controlPoint[0], controlPoint[1]))
        .append('circle')
        .attr('r', DEFAULT_STYLE.edge.controlRadius)
        .style('fill', d => calcEdgeColor(d.data))
        .style('cursor', 'pointer');

      // make sure mouseover doesn't obscure the more important edge-control
      if (edge.selectAll('.edge-control').node() !== null) {
        edge.node().insertBefore(edge.selectAll('.edge-mouseover-handle').node(), edge.selectAll('.edge-control').node());
      }
    });

    this.renderer.setCallback('edgeMouseLeave', (_evt, edge) => {
      edge.selectAll('.edge-mouseover-handle').remove();
    });

    this.refresh();
  },
  beforeUnmount() {
    this.mouseTrap.reset();
  },
  methods: {
    ...mapActions({
      setUpdateToken: 'app/setUpdateToken'
    }),
    saveCustomConcept(value) {
      this.$emit('suggestion-selected', {
        concept: value.theme,
        shortName: value.theme,
        label: value.theme,
        hasEvidence: false
      });
    },
    search(nodeId) {
      this.renderer.moveTo(nodeId, 1500);
      this.renderer.highlight({
        nodes: [nodeId]
      }, highlightOptions);
    },
    async refresh() {
      if (_.isEmpty(this.data)) return;
      this.renderer.setData(this.data);
      await this.renderer.render();

      this.highlight();
      this.renderer.hideNeighbourhood();

      // if there is a new node with an input textbox, focus input there
      if (d3.select('.node input[type=text]').node()) {
        d3.select('.node input[type=text]').node().focus();
      }

      this.renderer.enableDrag(true, this.dragMoveCallback, this.dragEndCallback);
      this.$emit('refresh', null);
    },
    dragMoveCallback(node, graph) {
      const nodeUI = node.select('.node-ui');
      const rect = nodeUI.select(targetNodeSelector);
      const nodeUIRect = rect.node();

      // Hide ephemeral UI/controls
      this.renderer.disableNodeHandles();
      svgUtil.hideSvgTooltip(this.renderer.chart);

      // FIXME: Should do this in drag-start
      if (nodeUI.select('.node-control').size() > 0) {
        node.select('.node-control').remove();
      }

      const others = graph.chart.selectAll('.node-ui')
        .filter(d => {
          return !d.nodes || d.nodes.length === 0;
        })
        .filter(d => d.id !== nodeUI.datum().id);

      let targetNode = null;

      others.selectAll(targetNodeSelector)
        .style('stroke', DEFAULT_STYLE.nodeHeader.stroke)
        .style('stroke-width', DEFAULT_STYLE.nodeHeader.strokeWidth);

      others.each(function () {
        const otherNodeUI = d3.select(this);
        const otherRect = otherNodeUI.select(targetNodeSelector);
        const otherNodeUIRect = otherRect.node();

        if (overlap(otherNodeUIRect, nodeUIRect, 0.5)) {
          targetNode = otherNodeUI;
          otherRect
            .style('stroke', mergeNodeColor)
            .style('stroke-width', 12);
        }
      });

      this.targetNode = targetNode;
    },
    async dragEndCallback(node) {
      if (this.targetNode !== null) {
        this.$emit('merge-nodes', node.datum(), this.targetNode.datum());

        // reset this.targetNode style, set null
        this.targetNode.select(targetNodeSelector)
          .style('fill', '#fff')
          .attr('height', d => d.height);
        this.targetNode = null;
      }
    },
    highlight() {
      // Check if the subgraph was added less than 1 min ago
      const thresholdTime = moment().subtract(THRESHOLD_TIME, 'minutes').valueOf();
      const nodes = this.data.nodes.filter(n => n.modified_at >= thresholdTime).map(n => n.concept);
      const edges = this.data.edges.filter(e => e.modified_at >= thresholdTime);
      this.renderer.highlight({ nodes, edges }, highlightOptions);
    },
    onSuggestionSelected(suggestion) {
      if (this.data.nodes.filter(node => node.concept === suggestion.concept).length > 0) {
        this.$emit('suggestion-duplicated', suggestion);
        return;
      }

      // HACK This is leveraing the svg-flowgraph internals.
      //
      // We inject the node-blueprint into the DOM with createNewNode, then when the
      // graph itself re-renders it will detect the node-blueprint, rebinds the data and
      // thus retaining the original layout.
      this.renderer.createNewNode(this.svgX, this.svgY, {
        concept: suggestion.concept,
        label: suggestion.label
      });

      this.$emit('suggestion-selected', suggestion);
    },
    focusNewNodeInput() {
      this.$refs.newNode.focusInput();
    },
    deselectNodeAndEdge() {
      this.renderer.hideNeighbourhood();
      this.selectedNode = '';
      this.renderer.clearSelections();
    },
    renderEdgeClick(sourceConcept, targetConcept) {
      const neighborhood = {
        nodes: [{ concept: sourceConcept }, { concept: targetConcept }],
        edges: [{ source: sourceConcept, target: targetConcept }]
      };

      this.deselectNodeAndEdge();
      this.renderer.showNeighborhood(neighborhood);
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.CAG-graph-container {
  position: relative;
}

.CAG-graph {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
