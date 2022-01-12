import * as d3 from 'd3';
import _ from 'lodash';
import { AbstractCAGRenderer, D3SelectionINode, D3SelectionIEdge } from './abstract-cag-renderer';
import { NodeParameter, EdgeParameter } from '@/types/CAG';
import {
  INode, getAStarPath, simplifyPath
} from 'svg-flowgraph';

import svgUtil from '@/utils/svg-util';
import { SELECTED_COLOR, UNDEFINED_COLOR } from '@/utils/colors-util';
import { calcEdgeColor, scaleByWeight } from '@/utils/scales-util';
import { hasBackingEvidence } from '@/utils/graphs-util';
import { DEFAULT_STYLE, polaritySettingsMap } from './cag-style';

const REMOVE_TIMER = 1000;


const pathFn = svgUtil.pathFn.curve(d3.curveBasis);
const distance = (a: {x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);


export class QualitativeRenderer extends AbstractCAGRenderer<NodeParameter, EdgeParameter> {
  newEdgeSourceId = '';
  newEdgeTargetId = '';

  temporaryNewEdge: any = null;
  handleBeingDragged = false;

  constructor(options: any) {
    super(options);

    this.on('node-mouse-enter', (_evtName, _evt: PointerEvent, selection: D3SelectionINode<NodeParameter>) => {
      if (this.newEdgeSourceId === '') {
        this.showNodeHandles(selection);
      }
      if (this.handleBeingDragged === true) return;

      this.showNodeMenu(selection);
    });

    this.on('node-mouse-leave', (_evtName, _evt: PointerEvent, selection: D3SelectionINode<NodeParameter>) => {
      if (this.newEdgeSourceId === '') {
        this.hideNodeHandles();
      }
      this.hideNodeMenu(selection);
    });

    this.on('edge-mouse-enter', (_evtName, evt: PointerEvent, selection: D3SelectionINode<NodeParameter>) => {
      const mousePoint = d3.pointer(evt, selection.node());
      const pathNode = selection.select('.edge-path').node();
      const controlPoint = (svgUtil.closestPointOnPath(pathNode as any, mousePoint) as number[]);

      selection.selectAll('.edge-mouseover-handle').remove();
      selection.append('g')
        .classed('edge-mouseover-handle', true)
        .attr('transform', svgUtil.translate(controlPoint[0], controlPoint[1]))
        .append('circle')
        .attr('r', DEFAULT_STYLE.edge.controlRadius)
        .style('fill', d => calcEdgeColor(d.data))
        .style('cursor', 'pointer');

      // make sure mouseover doesn't obscure the more important edge-control
      if (selection.selectAll('.edge-control').node() !== null) {
        (selection.node() as HTMLElement).insertBefore(selection.selectAll('.edge-mouseover-handle').node() as any, selection.selectAll('.edge-control').node() as any);
      }
    });


    this.on('edge-mouse-leave', (_evtName, _evt: PointerEvent, selection: D3SelectionINode<NodeParameter>) => {
      selection.selectAll('.edge-mouseover-handle').remove();
    });
  }

  renderNodesAdded(selection: D3SelectionINode<NodeParameter>) {
    selection.append('g').classed('node-handles', true);

    selection.append('rect')
      .classed('node-container', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', DEFAULT_STYLE.node.borderRadius)
      .attr('width', d => d.width || 0)
      .attr('height', d => d.height || 0)
      .style('stroke', DEFAULT_STYLE.node.stroke)
      .style('stroke-width', DEFAULT_STYLE.node.strokeWidth)
      .style('cursor', 'pointer')
      .style('fill', DEFAULT_STYLE.node.fill);

    selection
      .append('text')
      .classed('node-label', true)
      .attr('x', 10)
      .attr('y', 20)
      .style('pointer-events', 'none')
      .text(d => this.labelFormatter(d.label))
      .each(function (d) {
        if (d.width) {
          svgUtil.truncateTextToWidth(this, d.width - 20);
        }
      });
  }

  renderNodesUpdated(selection: D3SelectionINode<NodeParameter>) {
    selection
      .select('.node-label')
      .text(d => this.labelFormatter(d.label))
      .each(function (d) {
        if (d.width) {
          svgUtil.truncateTextToWidth(this as any, d.width - 20); // FIXME any
        }
      });
  }

  renderNodesRemoved(selection: D3SelectionINode<NodeParameter>) {
    selection.selectAll('rect').style('fill', '#E88');
    selection
      .transition()
      .duration(REMOVE_TIMER)
      .style('opacity', 0)
      .on('end', function() {
        d3.select((this as any).parentNode).remove(); // FIXME any
      });
  }

  renderEdgesAdded(selection: D3SelectionIEdge<EdgeParameter>) {
    // If we manually drew a new edge, we need to inject the path points back in, as positions are not stored.
    if (this.temporaryNewEdge) {
      const sourceNode = this.temporaryNewEdge.sourceNode;
      const targetNode = this.temporaryNewEdge.targetNode;
      const edge = this.graph.edges.find(d => d.source === sourceNode.label && d.target === targetNode.label);
      if (edge) {
        edge.points = this.getPathBetweenNodes(sourceNode, targetNode);
      }
      this.temporaryNewEdge = null;
    }

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

    edgeControl
      .append('text')
      .attr('x', d => {
        const setting = polaritySettingsMap.get(d.data.polarity || 0);
        if (setting) {
          return setting.x;
        }
        return 0;
      })
      .attr('y', d => {
        const setting = polaritySettingsMap.get(d.data.polarity || 0);
        if (setting) {
          return setting.y;
        }
        return 0;
      })
      .style('background-color', 'red')
      .style('font-family', 'FontAwesome')
      .style('font-size', d => {
        const setting = polaritySettingsMap.get(d.data.polarity || 0);
        if (setting) {
          return setting.fontSize;
        }
        return '';
      })
      .style('stroke', 'none')
      .style('fill', 'white')
      .style('cursor', 'pointer')
      .text(d => {
        const setting = polaritySettingsMap.get(d.data.polarity || 0);
        if (setting) {
          return setting.text;
        }
        return '';
      });
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
      .on('click', (evt, node) => {
        this.emit('rename-node', node.data);
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
      .on('click', (evt, node) => {
        this.emit('delete-node', node.data);
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
    // FIXME: this won't work with hierarchies
    return (p: { x: number; y: number }) => this.graph.nodes.some(n => p.x > n.x && p.x < n.x + n.width && p.y > n.y && p.y < n.y + n.height);
  }

  getPathBetweenNodes(source: INode<NodeParameter>, target: INode<NodeParameter>) {
    const getNodeEntrance = (node: INode<NodeParameter>, offset = 0) => ({ x: node.x + offset, y: node.y + 0.5 * node.height });
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

    node.select('.node-container')
      .attr('width', (d) => d.width - DEFAULT_STYLE.nodeHandles.width * 2)
      .attr('x', DEFAULT_STYLE.nodeHandles.width)
      .style('border-radius', DEFAULT_STYLE.node.highlighted.borderRadius)
      .style('stroke', DEFAULT_STYLE.node.highlighted.stroke)
      .style('stroke-width', DEFAULT_STYLE.node.highlighted.strokeWidth);

    node.select('path')
      .attr('transform', svgUtil.translate(DEFAULT_STYLE.nodeHandles.width * 2, DEFAULT_STYLE.nodeHandles.width));

    node.select('.node-label')
      .attr('x', 30)
      .text(d => this.labelFormatter(d.label))
      .each(function (d) { svgUtil.truncateTextToWidth(this as any, d.width - 50); });

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
        x: node.x + node.width + offset, y: node.y + 0.5 * node.height
      };
    };

    const drag = d3.drag()
      .on('start', async (evt) => {
        this.newEdgeSourceId = evt.subject.id; // Refers to datum, use id because layout position can change
        const sourceNode = getLayoutNodeById(this.newEdgeSourceId);
        this.emit('node-handle-drag-start', sourceNode.data);

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

            if (d3.select(evt.sourceEvent.target).classed('node-container') || d3.select(evt.sourceEvent.target).classed('handle')) {
              this.newEdgeTargetId = d3.select<SVGGElement, INode<NodeParameter>>(evt.sourceEvent.target).datum().id;

              if (this.newEdgeSourceId === this.newEdgeTargetId && distance(newEdgeStart, mousePoint) < 20) {
                this.newEdgeTargetId = '';
                return pathFn([]);
              }

              const pathPoints = this.getPathBetweenNodes(newEdgeSource, getLayoutNodeById(this.newEdgeTargetId));
              // D3 typescript weirdness
              return pathFn(pathPoints as any);
            } else {
              this.newEdgeTargetId = '';

              // D3 typescript weirdness
              return pathFn(simplifyPath(getAStarPath(newEdgeStart, mousePoint, this.getNodeCollider())) as any);
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

        this.emit('new-edge', {
          source: sourceNode.data,
          target: targetNode.data
        });
        this.handleBeingDragged = false;
      });
    handles.call(drag as any);
  }

  // FIXME Typescript weirdness
  hideNodeHandles() {
    const chart = this.chart;
    const nodes = chart.selectAll<SVGGElement, INode<NodeParameter>>('.node');

    nodes.select('.node-container')
      .attr('width', (d) => d.width)
      .attr('x', 0);

    nodes.select('.node-container:not(.node-selected)')
      .style('stroke', DEFAULT_STYLE.node.stroke)
      .style('stroke-width', DEFAULT_STYLE.node.strokeWidth);

    nodes.select('path')
      .attr('transform', svgUtil.translate(DEFAULT_STYLE.nodeHandles.width, DEFAULT_STYLE.nodeHandles.width));

    nodes.select('.node-label')
      .attr('x', 10)
      .text(d => this.labelFormatter(d.label))
      .each(function (d) { svgUtil.truncateTextToWidth(this as any, d.width - 20); });
    this.chart.selectAll('.node-handles').selectAll('*').remove();
  }

  resetDragState() {
    const chart = this.chart;
    chart.selectAll('.new-edge').remove();
    this.newEdgeSourceId = '';
    this.newEdgeTargetId = '';
  }
}
