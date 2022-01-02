import * as d3 from 'd3';
import _ from 'lodash';
import { NodeParameter, EdgeParameter } from '@/types/CAG';
import {
  DeltaRenderer, IEdge, INode,
  getAStarPath, simplifyPath
} from 'svg-flowgraph2';

import svgUtil from '@/utils/svg-util';
import { SELECTED_COLOR, UNDEFINED_COLOR } from '@/utils/colors-util';
import { calcEdgeColor, scaleByWeight } from '@/utils/scales-util';
import { hasBackingEvidence } from '@/utils/graphs-util';

type D3SelectionINode<T> = d3.Selection<d3.BaseType, INode<T>, null, any>;
type D3SelectionIEdge<T> = d3.Selection<d3.BaseType, IEdge<T>, null, any>;

const REMOVE_TIMER = 1000;

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

const pathFn = svgUtil.pathFn.curve(d3.curveBasis);



export class QualitativeRenderer extends DeltaRenderer<NodeParameter, EdgeParameter> {
  newEdgeSourceId = '';
  newEdgeTargetId = '';

  temporaryNewEdge: any = null;
  handleBeingDragged = false;

  constructor(options: any) {
    super(options);


    this.on('node-mouse-enter', (_evtName, _evt: PointerEvent, selection: D3SelectionINode<NodeParameter>) => {
      console.log('mouse enterd ');
      this.showNodeMenu(selection);
    });

    this.on('node-mouse-leave', (_evtName, _evt: PointerEvent, selection: D3SelectionINode<NodeParameter>) => {
      console.log('mouse leave');
      this.hideNodeMenu(selection);
    });
  }

  renderNodesAdded(selection: D3SelectionINode<NodeParameter>) {
    selection.append('g').classed('node-handles', true);

    selection.append('rect')
      .classed('node-header', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', DEFAULT_STYLE.nodeHeader.borderRadius)
      .attr('width', d => d.width || 0)
      .attr('height', d => d.height || 0)
      .style('stroke', DEFAULT_STYLE.nodeHeader.stroke)
      .style('stroke-width', DEFAULT_STYLE.nodeHeader.strokeWidth)
      .style('cursor', 'pointer')
      .style('fill', DEFAULT_STYLE.nodeHeader.fill);

    selection
      .append('text')
      .classed('node-label', true)
      .attr('x', 10)
      .attr('y', 20)
      .style('pointer-events', 'none')
      .text(d => d.label)
      .each(function (d) {
        if (d.width) {
          svgUtil.truncateTextToWidth(this, d.width - 20);
        }
      });
  }

  renderNodesUpdated(selection: D3SelectionINode<NodeParameter>) {
    selection
      .select('.node-label')
      .text(d => d.label)
      .each(function (d) {
        if (d.width) {
          svgUtil.truncateTextToWidth(this as any, d.width - 20); // FIXME any
        }
      });
  }

  renderNodesRemoved(selection: D3SelectionINode<NodeParameter>) {
    console.log(selection);
    selection.selectAll('rect').style('fill', '#E88');
    selection
      .transition()
      .duration(1000)
      .style('opacity', 0)
      .on('end', function() {
        d3.select((this as any).parentNode).remove(); // FIXME any
      });
  }

  renderEdgesAdded(selection: D3SelectionIEdge<EdgeParameter>) {
    selection
      .append('path')
      .classed('edge-path-bg', true)
      .style('fill', DEFAULT_STYLE.edgeBg.fill)
      .style('stroke', DEFAULT_STYLE.edgeBg.stroke)
      .style('stroke-width', d => scaleByWeight(DEFAULT_STYLE.edge.strokeWidth, d.data) + 2)
      .attr('d', d => pathFn(d.points as any));

    selection
      .append('path')
      .classed('edge-path', true)
      .style('fill', DEFAULT_STYLE.edge.fill)
      .attr('d', d => pathFn(d.points as any))
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

  renderEdgesUpdated(selection: D3SelectionIEdge<EdgeParameter>) {
    selection
      .select('.edge-path')
      .style('stroke', d => calcEdgeColor(d.data))
      .style('stroke-width', d => scaleByWeight(DEFAULT_STYLE.edge.strokeWidth, d.data))
      .style('stroke-dasharray', d => hasBackingEvidence(d.data) ? null : DEFAULT_STYLE.edge.strokeDash);

    selection
      .select('.edge-path')
      .attr('d', d => {
        return pathFn(d.points as any);
      });
    selection
      .select('.edge-path-bg')
      .attr('d', d => {
        return pathFn(d.points as any);
      });
  }

  renderEdgesRemoved(selection: D3SelectionIEdge<EdgeParameter>) {
    selection
      .transition()
      .duration(REMOVE_TIMER)
      .style('opacity', 0)
      .remove();
  }

  setupDefs() {
    const svg = d3.select(this.svgEl);
    const edges = this.graph.edges;

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

  renderEdgeControls(selection: D3SelectionIEdge<EdgeParameter>) {
    this.chart.selectAll('.edge-control').selectAll('*').remove();
    const edgeControl = selection.select('.edge-control');
    // edgeControl
    //   .transition()
    //   .duration(500)
    //   .attrTween('transform', function () {
    //     return () => {
    //       // this is a bit odd because there is no transition per say, instead each time it just moves it back on to the line as the line is transitioned.
    //       const translate = svgUtil.getTranslateFromSVGTransform(this.transform);
    //       const pathNode = d3.select(this.parentNode).select('.edge-path').node();
    //       const controlPoint = svgUtil.closestPointOnPath(pathNode, translate);
    //       return svgUtil.translate(controlPoint[0], controlPoint[1]);
    //     };
    //   });

    edgeControl
      .append('circle')
      .attr('r', DEFAULT_STYLE.edge.controlRadius + 2)
      .style('fill', DEFAULT_STYLE.edgeBg.stroke)
      .attr('stroke', SELECTED_COLOR)
      .style('cursor', 'pointer');

    edgeControl
      .append('circle')
      .attr('r', DEFAULT_STYLE.edge.controlRadius)
      .style('fill', d => calcEdgeColor(d.data))
      .style('cursor', 'pointer');

    const controlStyles = svgUtil.POLARITY_ICON_SVG_SETTINGS;

    edgeControl
      .append('text')
      // @ts-ignore
      .attr('x', d => controlStyles[d.data.polarity].x)
      // @ts-ignore
      .attr('y', d => controlStyles[d.data.polarity].y)
      .style('background-color', 'red')
      .style('font-family', 'FontAwesome')
      // @ts-ignore
      .style('font-size', d => controlStyles[d.data.polarity]['font-size'])
      .style('stroke', 'none')
      .style('fill', 'white')
      .style('cursor', 'pointer')
      // @ts-ignore
      .text(d => controlStyles[d.data.polarity].text);
  }

  showNodeMenu(node: D3SelectionINode<NodeParameter>) {
    const H = node.datum().height || 50;
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
      .on('click', (evt) => {
        // renderer.options.renameFn(node.data);
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
        // renderer.options.deleteFn(node);
        evt.stopPropagation();
      });

    control.append('text')
      .attr('x', 74)
      .attr('y', H + 4 + 15)
      .style('fill', '#eee')
      .text('Delete')
      .style('pointer-events', 'none');
  }

  hideNodeMenu(node: D3SelectionINode<NodeParameter>) {
    node.select('.node-control').remove();
  }


  getNodeCollider() {
    // TODO: this won't work with hierarchies
    // @ts-ignore
    return (p) => this.graph.nodes.some(n => p.x > n.x && p.x < n.x + n.width && p.y > n.y && p.y < n.y + n.height);
  }

  getPathBetweenNodes(source: INode<NodeParameter>, target: INode<NodeParameter>) {
    // @ts-ignore
    const getNodeEntrance = (node: INode<NodeParameter>, offset = 0) => ({ x: node.x + offset, y: node.y + 0.5 * node.height });

    // @ts-ignore
    const getNodeExit = (node: INode<NodeParameter>, offset = 0) => ({ x: node.x + node.width + offset, y: node.y + 0.5 * node.height });

    return [
      getNodeExit(source),
      ...simplifyPath(getAStarPath(getNodeExit(source, 5), getNodeEntrance(target, -5), this.getNodeCollider())),
      getNodeEntrance(target)
    ];
  }

  showNodeHandles(node: D3SelectionINode<NodeParameter>) {
    const chart = this.chart;
    const svg = d3.select(this.svgEl);
    const handles = node.select('.node-handles').append('g');

    const nodeWidth = node.datum().width || 0;
    const nodeHeight = node.datum().height || 0;

    node.select('.node-header')
      .attr('width', (d) => d.width ?? 0 - DEFAULT_STYLE.nodeHandles.width * 2)
      .attr('x', DEFAULT_STYLE.nodeHandles.width)
      .style('border-radius', DEFAULT_STYLE.nodeHeader.highlighted.borderRadius)
      .style('stroke', DEFAULT_STYLE.nodeHeader.highlighted.stroke)
      .style('stroke-width', DEFAULT_STYLE.nodeHeader.highlighted.strokeWidth);

    node.select('path')
      .attr('transform', svgUtil.translate(DEFAULT_STYLE.nodeHandles.width * 2, DEFAULT_STYLE.nodeHandles.width));

    node.select('.node-label')
      .attr('x', 30)
      .text(d => d.label)
      // @ts-ignore
      .each(function (d) { svgUtil.truncateTextToWidth(this, d.width ?? 0 - 50); });

    handles.append('rect')
      .classed('handle', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .style('cursor', 'pointer')
      .style('fill', '#4E4F51');

    handles.append('text')
      .attr('x', DEFAULT_STYLE.nodeHandles.width * 0.2)
      .attr('y', nodeHeight * 0.625)
      .style('font-family', 'FontAwesome')
      .style('font-size', '12px')
      .style('stroke', 'none')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text('\uf061');

    handles.append('text')
      .attr('x', nodeWidth - DEFAULT_STYLE.nodeHandles.width * 0.85)
      .attr('y', nodeHeight * 0.625)
      .style('font-family', 'FontAwesome')
      .style('font-size', '12px')
      .style('stroke', 'none')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text('\uf061');

    // FIXME need to flatten
    const getLayoutNodeById = (id: string) => {
      const r = this.graph.nodes.find(n => n.id === id);
      return r as INode<NodeParameter>;
    };
    const getNodeExit = (node: INode<NodeParameter>, offset = 0) => {
      return {
        // @ts-ignore
        x: node.x + node.width + offset, y: node.y + 0.5 * node.height
      };
    };

    const distance = (a: {x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

    const drag = d3.drag()
      .on('start', async (evt) => {
        this.newEdgeSourceId = evt.subject.id; // Refers to datum, use id because layout position can change
        // const graph = evt.subject.parent.data; // FIXME - we should avoid this kind of data access, we should probably pass projectID into the renderer directly

        // Begin processing to highlight nodes that have evidence for an edge originating from the source
        // const sourceNode = getLayoutNodeById(this.newEdgeSourceId);
        // const project_id = graph.project_id;
        // const nodesInGraph = graph.nodes;

        // const edges = graph.edges;
        // const nodesToCheck = nodesInGraph
        //   .filter(node => node.components)
        //   .filter(node => {
        //     return !_.some(edges, edge => edge.source === sourceNode.concept && edge.target === node.concept);
        //   });
        // const componentsInGraph = _.uniq(_.flatten(nodesToCheck.map(node => node.components)));

        // const svg = this.svgEl;
        // const foregroundLayer = d3.select(svg).select('.data-layer');

        // const filters = {
        //   clauses: [
        //     { field: 'subjConcept', values: sourceNode.data.components, isNot: false, operand: 'or' },
        //     { field: 'objConcept', values: componentsInGraph, isNot: false, operand: 'or' }]
        // };

        // Get the edges, then reverse-map the edges back into containers
        // projectService.getProjectGraph(project_id, filters).then(d => {
        //   // Contains all possible edges in the knowledge-base originating from the source
        //   const resultEdges = d.edges;
        //   resultEdges.forEach(edge => {
        //     const nodes = nodesToCheck.filter(n => n.components.includes(edge.target));
        //     nodes.forEach(nodeData => {
        //       const targetNode = getLayoutNodeById(nodeData.concept);
        //       const pointerX = targetNode.x;
        //       const pointerY = targetNode.y + (targetNode.height * 0.5);
        //       foregroundLayer
        //         .append('svg:path')
        //         .attr('d', svgUtil.ARROW)
        //         .classed('edge-possibility-indicator', true)
        //         .attr('transform', `translate(${pointerX}, ${pointerY}) scale(1.8)`)
        //         .attr('fill', calcEdgeColor(edge))
        //         .attr('opactiy', 0)
        //         .style('pointer-events', 'none')
        //         .transition()
        //         .duration(300)
        //         .attr('opacity', 1);
        //     });
        //   });
        // });

        // mark dragging flag
        this.handleBeingDragged = true;
      })
      .on('drag', (evt) => {
        chart.selectAll('.new-edge').remove();
        const pointerCoords = d3.zoomTransform(svg.node() as Element).invert(d3.pointer(evt, svg.node()));
        chart.append('path')
          .classed('new-edge', true)
          .attr('d', () => {
            const newEdgeSource = getLayoutNodeById(evt.subject.id);
            const newEdgeStart = getNodeExit(newEdgeSource);
            const mousePoint = { x: pointerCoords[0], y: pointerCoords[1] };

            if (d3.select(evt.sourceEvent.target).classed('node-header') || d3.select(evt.sourceEvent.target).classed('handle')) {
              // @ts-ignore
              this.newEdgeTargetId = d3.select(evt.sourceEvent.target).datum().id;

              if (this.newEdgeSourceId === this.newEdgeTargetId && distance(newEdgeStart, mousePoint) < 20) {
                this.newEdgeTargetId = '';
                return pathFn([]);
              }

              const pathPoints = this.getPathBetweenNodes(newEdgeSource, getLayoutNodeById(this.newEdgeTargetId));
              // @ts-ignore: D3 weirdness
              return pathFn(pathPoints);
            } else {
              this.newEdgeTargetId = '';

              // @ts-ignore: D3 weirdness
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

        this.hideNodeHandles();
        this.resetDragState();

        // remove edge indicators
        const indicators = d3.selectAll('.edge-possibility-indicator');
        indicators
          .transition()
          .duration(300)
          .style('opacity', 0)
          .remove();

        if (_.isNil(sourceNode) || _.isNil(targetNode)) return;
        this.temporaryNewEdge = { sourceNode, targetNode };

        // FIXME
        // this.options.newEdgeFn(sourceNode.data, targetNode.data);

        this.handleBeingDragged = false;
      });
    handles.call(drag as any);
  }

  // FIXME Typescript weirdness
  hideNodeHandles() {
    const chart = this.chart;
    const nodes = chart.selectAll('.node');

    nodes.select('.node-header')
      .attr('width', (d: any) => d.width)
      .attr('x', 0);

    nodes.select('.node-header:not(.node-selected)')
      .style('stroke', DEFAULT_STYLE.nodeHeader.stroke)
      .style('stroke-width', DEFAULT_STYLE.nodeHeader.strokeWidth);

    nodes.select('path')
      .attr('transform', svgUtil.translate(DEFAULT_STYLE.nodeHandles.width, DEFAULT_STYLE.nodeHandles.width));

    nodes.select('.node-label')
      .attr('x', 10)
      .text((d: any) => d.label)
      // @ts-ignore
      .each(function (d: any) { svgUtil.truncateTextToWidth(this, d.width - 20); });
    this.chart.selectAll('.node-handles').selectAll('*').remove();
  }


  resetDragState() {
    const chart = this.chart;
    chart.selectAll('.new-edge').remove();
    this.newEdgeSourceId = '';
    this.newEdgeTargetId = '';
  }

  selectNode(node: D3SelectionINode<NodeParameter>) {
    node.select('.node-header')
      .style('border-radius', DEFAULT_STYLE.nodeHeader.highlighted.borderRadius)
      .style('stroke', DEFAULT_STYLE.nodeHeader.highlighted.stroke)
      .style('stroke-width', DEFAULT_STYLE.nodeHeader.highlighted.strokeWidth);
  }

  selectEdge(evt: Event, edge: D3SelectionIEdge<EdgeParameter>) {
    const mousePoint = d3.pointer(evt, edge.node());
    const pathNode = edge.select('.edge-path').node();
    const controlPoint = (svgUtil.closestPointOnPath(pathNode as any, mousePoint) as number[]);

    edge.append('g')
      .classed('edge-control', true)
      .attr('transform', svgUtil.translate(controlPoint[0], controlPoint[1]));

    this.renderEdgeControls(edge);
  }
}
