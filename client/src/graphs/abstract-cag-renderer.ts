import * as d3 from 'd3';
import _ from 'lodash';
import { createOutline, addPadding } from 'bubblesets-js';
import svgUtil from '@/utils/svg-util';
import { DeltaRenderer, IGraph, IEdge, INode, traverseGraph, moveTo, highlight, unHighlight, flattenGraph } from 'svg-flowgraph';
import { DEFAULT_STYLE } from './cag-style';
import { SELECTED_COLOR } from '@/utils/colors-util';
import { CAGVisualState } from '@/types/CAG';

const FADED_OPACITY = 0.2;
const AMBIGUOUS_MSG = 'To make CAG projections easier to interpret, <br /> select each grey edge and clarify its polarity in the side panel.';

type NeighborNode = {
  concept: string;
};
type NeighborEdge = {
  source: string;
  target: string;
};

export type D3SelectionINode<V> = d3.Selection<d3.BaseType, INode<V>, null, any>;
export type D3SelectionIEdge<E> = d3.Selection<d3.BaseType, IEdge<E>, null, any>;

const createStatsGroup = (foregroundLayer: any) => {
  let statsGroup = d3.select('.graph-stats-info');
  if (statsGroup.size() === 0) {
    statsGroup = foregroundLayer.append('g')
      .attr('transform', svgUtil.translate(5, 10))
      .classed('graph-stats-info', true);

    statsGroup.append('text')
      .classed('graph-stats-ambiguouity', true)
      .attr('fill', '#D80')
      .attr('x', 15)
      .attr('y', 15)
      .text('');
  }
  return statsGroup;
};

const flattenGraph2 = <V, E>(graph: IGraph<V, E>): { nodes: INode<V>[], edges: IEdge<E>[] } => {
  let nodes: INode<V>[] = [];
  traverseGraph(graph, (node) => {
    nodes = nodes.concat(node);
  });

  return {
    nodes,
    edges: graph.edges
  };
};

export abstract class AbstractCAGRenderer<V, E> extends DeltaRenderer<V, E> {
  labelFormatter: (label: string) => string = (s) => s;

  setLabelFormatter(fn: (label: string) => string) {
    this.labelFormatter = fn;
  }

  displayGraphStats() {
    const graph = this.graph;
    const svg = d3.select(this.svgEl);
    const foregroundLayer = svg.select('.foreground-layer');

    const statsGroup = createStatsGroup(foregroundLayer);

    let hasAmbiguousEdges = false;
    for (const edge of graph.edges) {
      const polarity = (edge as any).data.polarity; // FIXME
      if (polarity !== 1 && polarity !== -1) {
        hasAmbiguousEdges = true;
        break;
      }
    }

    // Update ambiguouity status
    if (hasAmbiguousEdges) {
      statsGroup.select('.graph-stats-ambiguouity').text('Ambiguous edges detected')
        .on('mouseover', (evt) => {
          const point = d3.pointer(evt);

          // Force tooltip to go near the end of the text
          const x = +statsGroup.select('.graph-stats-ambiguouity').attr('x') + 150;
          svgUtil.showSvgTooltip(foregroundLayer, AMBIGUOUS_MSG, [x, point[1]], Math.PI / 2);
        })
        .on('mouseout', () => svgUtil.hideSvgTooltip(foregroundLayer));
    } else {
      statsGroup.select('.graph-stats-ambiguouity').text('').on('mouseover', null).on('mouseout', null);
    }
  }


  // Override render function to also check for ambigous edges and highlight them
  async render() {
    await super.render();
    this.displayGraphStats();
  }

  neighborhoodAnnotation({ nodes, edges }: { nodes: NeighborNode[]; edges: NeighborEdge[] }) {
    const chart = this.chart;

    // FIXME: not very efficient
    const nonNeighborNodes = chart.selectAll('.node').filter((d: any) => {
      return !nodes.map(node => node.concept).includes(d.label);
    });
    nonNeighborNodes.style('opacity', FADED_OPACITY);

    const nonNeighborEdges = chart.selectAll('.edge').filter((d: any) => !_.some(edges, edge => edge.source === d.data.source && edge.target === d.data.target));
    nonNeighborEdges.style('opacity', FADED_OPACITY);
  }

  resetAnnotations() {
    const chart = this.chart;
    chart.selectAll('.node').style('opacity', 1);
    chart.selectAll('.edge').style('opacity', 1);
    chart.selectAll('.node-ui').classed('selected', false);

    chart.selectAll('.edge').classed('selected', false);
    chart.selectAll('.edge-path-bg-outline').style('stroke', null);

    chart.selectAll('.node-container, .node-container-outer') // Clean up previous highlights
      .style('border-radius', DEFAULT_STYLE.node.borderRadius)
      .style('stroke', DEFAULT_STYLE.node.stroke)
      .style('stroke-width', DEFAULT_STYLE.node.strokeWidth);
  }

  selectNode(node: D3SelectionINode<V>, color: string) {
    node.selectAll('.node-container, .node-container-outer')
      .style('border-radius', DEFAULT_STYLE.node.highlighted.borderRadius)
      .style('stroke', _.isEmpty(color) ? DEFAULT_STYLE.node.highlighted.stroke : color)
      .style('stroke-width', DEFAULT_STYLE.node.highlighted.strokeWidth);
    node.classed('selected', true);
  }

  selectEdge(edge: D3SelectionIEdge<E>, color: string = SELECTED_COLOR) {
    edge.select('.edge-path-bg-outline').style('stroke', color);
    edge.classed('selected', true);
  }

  selectNodeByConcept(concept: string, color: string) {
    const node = this.chart.selectAll('.node-ui').filter((node: any) => node.label === concept);
    if (node) {
      this.selectNode(node as any, color);
    }
  }


  selectEdgeBySourceTarget(source: string, target: string, color: string) {
    const edge = this.chart.selectAll('.edge').filter((edge: any) => edge.source === source && edge.target === target);
    if (edge) {
      this.selectEdge(edge as any, color);
    }
  }

  applyVisualState(visualState: CAGVisualState) {
    this.resetAnnotations();
    if (visualState.focus) {
      if (!_.isEmpty(visualState.focus.nodes) || !_.isEmpty(visualState.focus.edges)) {
        this.neighborhoodAnnotation(visualState.focus);
      }
    }
    if (visualState.outline.nodes) {
      for (const node of visualState.outline.nodes) {
        this.selectNodeByConcept(node.concept, node.color ? node.color : SELECTED_COLOR);
      }
      for (const edge of visualState.outline.edges) {
        this.selectEdgeBySourceTarget(edge.source, edge.target, edge.color ? edge.color : SELECTED_COLOR);
      }
    }
  }

  // Hide graph search results
  hideSearchCandidates() {
    this.chart.selectAll('.node-header').style('fill', DEFAULT_STYLE.node.fill);
  }

  // Show graph search results
  showSearchCandidates(candidates: string[]) {
    const nodes = this.chart.selectAll('.node').filter((d: any) => candidates.includes(d.label));
    nodes.selectAll('.node-header').style('fill', DEFAULT_STYLE.node.matched);
  }

  // @override
  // Override default behaviour
  stableLayoutCheck(): boolean {
    const chart = this.chart;
    const options = this.options;
    const flattened = flattenGraph2(this.graph);
    const numNodes = flattened.nodes.length;
    return (options.useStableLayout && numNodes <= chart.selectAll('.node').size()) as boolean;
  }


  // Create a contour
  bubbleSet({ bubbleNodes, bubbleEdges }: { bubbleNodes: NeighborNode[], bubbleEdges: any[] }, color = '#369') {
    const flattened = flattenGraph(this.graph);
    const lookup = new Map<string, { x: number, y: number }>();

    for (const n of flattened.nodes) {
      if (n.nodes.length > 0) {
        for (const child of n.nodes) {
          lookup.set(child.label, { x: n.x, y: n.y });
        }
      }
    }

    // Calculate contours
    const nodes = flattened.nodes;
    const inSetNodes = nodes.filter(node => {
      return _.some(bubbleNodes, d => d.concept === node.label) && node.nodes.length === 0;
    });
    const outSetNodes = nodes.filter(node => {
      return !_.some(bubbleNodes, d => d.concept === node.label) && node.nodes.length === 0;
    });

    const list = createOutline(
      addPadding(inSetNodes.map(n => {
        const pCoord = lookup.get(n.label) || { x: 0, y: 0 };
        return {
          x: n.x + pCoord.x,
          y: n.y + pCoord.y,
          width: n.width,
          height: n.height
        };
      }), 10) as any,

      addPadding(outSetNodes.map(n => {
        const pCoord = lookup.get(n.label) || { x: 0, y: 0 };
        return {
          x: n.x + pCoord.x,
          y: n.y + pCoord.y,
          width: n.width,
          height: n.height
        };
      }), 10) as any,
      bubbleEdges, // edges,
      {} // options
    ).sample(8);

    // Render contour
    const pathFn = svgUtil.pathFn;
    this.chart.append('path')
      .classed('bubbleset', true)
      .attr('d', pathFn(list.points as any) as any)
      .style('stroke', color)
      .style('stroke-width', 2)
      .style('stroke-opacity', 0.8)
      .style('fill', color)
      .style('fill-opacity', 0.15);
  }
}

export {
  moveTo,
  highlight,
  unHighlight
};
