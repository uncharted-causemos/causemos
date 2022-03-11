import * as d3 from 'd3';
import { NodeParameter, EdgeParameter, NodeScenarioData } from '@/types/CAG';
import svgUtil from '@/utils/svg-util';
import { calcEdgeColor, scaleByWeight } from '@/utils/scales-util';
import { hasBackingEvidence } from '@/utils/graphs-util';
import { decodeWeights } from '@/services/model-service';
import { AbstractCAGRenderer, D3SelectionINode, D3SelectionIEdge } from './abstract-cag-renderer';
import renderHistoricalProjectionsChart from '@/charts/scenario-renderer';
import { DEFAULT_STYLE } from './cag-style';
import { SELECTED_COLOR } from '@/utils/colors-util';

const GRAPH_HEIGHT = 55;
const GRAPH_VERTICAL_MARGIN = 6;
const PADDING_HORIZONTAL = 5;
const PADDING_BOTTOM = 3;
const INDICATOR_NAME_SIZE = 7;
const INDICATOR_NAME_COLOR = '#999';


type ScenarioData = {
  [concept: string]: NodeScenarioData;
};

const pathFn = svgUtil.pathFn.curve(d3.curveBasis);


const SHOCK_PATH = 'M9.9375 5.25H7.21875L8.22656 2.22656C8.32031 1.85156 8.03906 1.5 7.6875 1.5H4.3125C4.03125 1.5 3.77344 1.71094 3.75 1.99219L3 7.61719C2.95312 7.96875 3.21094 8.25 3.5625 8.25H6.32812L5.25 12.8203C5.17969 13.1719 5.4375 13.5 5.78906 13.5C6 13.5 6.1875 13.4062 6.28125 13.2188L10.4062 6.09375C10.6406 5.74219 10.3594 5.25 9.9375 5.25Z';
const EXCLAMATION_PATH = 'M14.3359 11.8359L8.71094 2.0625C8.28906 1.33594 7.1875 1.3125 6.76562 2.0625L1.14062 11.8359C0.71875 12.5625 1.25781 13.5 2.125 13.5H13.3516C14.2188 13.5 14.7578 12.5859 14.3359 11.8359ZM7.75 9.79688C8.33594 9.79688 8.82812 10.2891 8.82812 10.875C8.82812 11.4844 8.33594 11.9531 7.75 11.9531C7.14062 11.9531 6.67188 11.4844 6.67188 10.875C6.67188 10.2891 7.14062 9.79688 7.75 9.79688ZM6.71875 5.92969C6.69531 5.76562 6.83594 5.625 7 5.625H8.47656C8.64062 5.625 8.78125 5.76562 8.75781 5.92969L8.59375 9.11719C8.57031 9.28125 8.45312 9.375 8.3125 9.375H7.16406C7.02344 9.375 6.90625 9.28125 6.88281 9.11719L6.71875 5.92969Z';
const ICON_OFFSET_SHOCK = 7;
const ICON_OFFSET_WARN = 8;
const WARN = '#f80';

export class QuantitativeRenderer extends AbstractCAGRenderer<NodeParameter, EdgeParameter> {
  scenarioData: ScenarioData = {};
  engine = 'dyse';

  constructor(options: any) {
    super(options);

    this.on('node-mouse-enter', (_evtName, __event: PointerEvent, nodeSelection: D3SelectionINode<NodeParameter>) => {
      const node = nodeSelection.datum();
      const label = node.label;
      if (label.length !== nodeSelection.select('.node-label').text().replace(/^\*/, '').length) {
        svgUtil.showSvgTooltip(
          this.chart,
          label,
          [node.x + node.width / 2, node.y]
        );
      }
      if (nodeSelection.classed('selected')) {
        return;
      }
      nodeSelection.selectAll('.node-container, .node-container-outer')
        .style('stroke', SELECTED_COLOR)
        .style('stroke-width', DEFAULT_STYLE.node.highlighted.strokeWidth);
    });

    this.on('node-mouse-leave', (_evtName, __event: PointerEvent, nodeSelection: D3SelectionINode<NodeParameter>) => {
      svgUtil.hideSvgTooltip(this.chart);
      if (nodeSelection.classed('selected')) {
        return;
      }
      nodeSelection.selectAll('.node-container, .node-container-outer')
        .style('stroke', DEFAULT_STYLE.node.stroke)
        .style('stroke-width', DEFAULT_STYLE.node.strokeWidth);
    });

    this.on('node-drag-move', () => {
      svgUtil.hideSvgTooltip(this.chart);
      this.renderEdgeeAnnotations();
    });

    this.on('node-drag-end', () => {
      svgUtil.hideSvgTooltip(this.chart);
      this.renderEdgeeAnnotations();
    });

    this.on('edge-mouse-enter', (_evtName, evt: PointerEvent, selection: D3SelectionINode<NodeParameter>) => {
      selection.select('.edge-path-bg-outline')
        .style('stroke', SELECTED_COLOR);
    });

    this.on('edge-mouse-leave', (_evtName, _evt: PointerEvent, selection: D3SelectionINode<NodeParameter>) => {
      if (selection.classed('selected')) {
        return;
      }

      selection.select('.edge-path-bg-outline')
        .style('stroke', null);
    });
  }

  setScenarioData(scenarioData: ScenarioData) {
    this.scenarioData = scenarioData;
  }

  setEngine(engine: string) {
    this.engine = engine;
  }

  renderNodesAdded(selection: D3SelectionINode<NodeParameter>) {
    selection.filter(d => d.data.components.length > 1)
      .append('rect')
      .classed('node-container-outer', true)
      .attr('x', -3)
      .attr('y', -3)
      .attr('rx', DEFAULT_STYLE.node.borderRadius + 3)
      .attr('width', d => d.width + 6)
      .attr('height', d => d.height + 6)
      .style('fill', DEFAULT_STYLE.node.fill)
      .style('stroke', DEFAULT_STYLE.node.stroke)
      .style('stroke-width', DEFAULT_STYLE.node.strokeWidth);

    selection.append('rect')
      .classed('node-container', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', DEFAULT_STYLE.node.borderRadius)
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .style('fill', DEFAULT_STYLE.node.fill)
      .style('stroke', DEFAULT_STYLE.node.stroke)
      .style('stroke-width', DEFAULT_STYLE.node.strokeWidth);


    const groupHeader = selection.append('g')
      .classed('node-header-group', true);

    const halfStrokeWidth = DEFAULT_STYLE.node.strokeWidth / 2;

    // Node header
    groupHeader
      .append('rect')
      .classed('node-header', true)
      .attr('x', halfStrokeWidth)
      .attr('y', halfStrokeWidth)
      .attr('rx', DEFAULT_STYLE.nodeHeader.borderRadius)
      .attr('width', d => d.width - DEFAULT_STYLE.node.strokeWidth)
      .attr('height', GRAPH_HEIGHT * 0.5)
      .style('fill', DEFAULT_STYLE.nodeHeader.fill);

    selection.append('text')
      .classed('node-label', true)
      .attr('transform', svgUtil.translate(PADDING_HORIZONTAL, GRAPH_HEIGHT * 0.5 - 14))
      .style('stroke', 'none')
      .style('fill', '#000')
      .text(d => this.labelFormatter(d.label))
      .each(function (d) { svgUtil.truncateTextToWidth(this, d.width - 2 * PADDING_HORIZONTAL); });

    selection.append('g')
      .classed('node-body-group', true)
      .append('rect')
      .classed('node-body', true)
      .attr('x', 0)
      .attr('y', GRAPH_HEIGHT * 0.5)
      .attr('width', d => d.width)
      .attr('height', GRAPH_HEIGHT)
      .style('fill', 'transparent');
  }

  renderNodesUpdated(/* selection: D3SelectionINode<NodeParameter> */) {
  }

  renderNodesRemoved(/* selection: D3SelectionINode<NodeParameter> */) {
  }

  renderEdgesAdded(selection: D3SelectionIEdge<EdgeParameter>) {
    selection
      .append('path')
      .classed('edge-path-bg-outline', true)
      .style('fill', DEFAULT_STYLE.edgeBg.fill)
      .style('stroke', null)
      .style('stroke-width', d => scaleByWeight(DEFAULT_STYLE.edge.strokeWidth, d.data) + 7)
      .attr('d', d => pathFn(d.points as any));

    selection
      .append('path')
      .classed('edge-path-bg', true)
      .attr('d', d => pathFn(d.points as any))
      .style('fill', DEFAULT_STYLE.edgeBg.fill)
      .style('stroke', DEFAULT_STYLE.edgeBg.stroke)
      .style('stroke-width', d => scaleByWeight(DEFAULT_STYLE.edge.strokeWidth, d.data) + 2);

    selection
      .append('path')
      .classed('edge-path', true)
      .attr('d', d => pathFn(d.points as any))
      .style('fill', DEFAULT_STYLE.edge.fill)
      .style('stroke', d => calcEdgeColor(d.data))
      .style('stroke-width', d => scaleByWeight(DEFAULT_STYLE.edge.strokeWidth, d.data))
      .style('stroke-dasharray', d => hasBackingEvidence(d.data) ? null : DEFAULT_STYLE.edge.strokeDash)
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

    this.renderEdgeeAnnotations();
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

  renderEdgesRemoved(/* selection: D3SelectionIEdge<EdgeParameter> */) {
  }

  setupDefs() {
    const svg = d3.select(this.svgEl);
    const edges = this.graph.edges;

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

    svg.select('defs')
      .append('filter')
      .attr('id', 'node-shadow')
      .append('feDropShadow')
      .attr('dx', '.1')
      .attr('dy', '.2')
      .attr('stdDeviation', '2');

    return svg;
  }

  renderEdgeeAnnotations() {
    this.chart.selectAll('.shock-relation').remove();
    this.chart.selectAll('.warn-relation').remove();

    const allEdgeSelection = this.chart.selectAll('.edge') as D3SelectionIEdge<EdgeParameter>;

    const shockEdgesSelection = allEdgeSelection.filter(e => {
      const param = e.data.parameter;
      if (!param) {
        return false;
      }
      if (param.weights && param.weights[0] > param.weights[1]) {
        return true;
      }
      return false;
    });

    shockEdgesSelection.each((_d, i, groups) => {
      if (groups[i]) {
        const s = d3.select(groups[i]);
        const pathNode = s.select('path').node() as SVGPathElement;
        const total = pathNode.getTotalLength();
        const point = pathNode.getPointAtLength(total - (ICON_OFFSET_SHOCK * 3));

        const shockGroup = s.append('g')
          .classed('shock-relation', true);

        shockGroup.append('circle')
          .attr('cx', point.x)
          .attr('cy', point.y)
          .attr('r', DEFAULT_STYLE.edge.controlRadius)
          .style('stroke', (d: any) => calcEdgeColor(d.data))
          .style('stroke-opacity', 0.5)
          .style('fill', DEFAULT_STYLE.edgeBg.stroke);

        shockGroup.append('path')
          .attr('d', SHOCK_PATH)
          .attr('transform', `translate(${point.x - ICON_OFFSET_SHOCK}, ${point.y - ICON_OFFSET_SHOCK})`)
          .style('fill', (d: any) => calcEdgeColor(d.data));
      }
    });

    const warnRelations = allEdgeSelection.filter(e => {
      const param = e.data.parameter;
      if (!param) {
        return false;
      }
      const inferred = decodeWeights(param.engine_weights[this.engine]);
      const current = decodeWeights(param.weights);

      // If inferred and current have different types
      if (inferred.weightType !== current.weightType) {
        return true;
      }

      if (Math.abs(inferred.weightValue - current.weightValue) > 0.5) {
        return true;
      }

      // If inferred and current have different polarity, Delphi only
      const polarity = e.data.polarity || 0;
      if (this.engine === 'delphi' || this.engine === 'delphi_dev') {
        const w = param.engine_weights[this.engine];
        if (w[2] && w[2] * polarity < 0) {
          return true;
        }
      }
      return false;
    });

    warnRelations.each((_d, i, groups) => {
      if (groups[i]) {
        const s = d3.select(groups[i]);
        const pathNode = s.select('path').node() as SVGPathElement;
        const total = pathNode.getTotalLength();
        const point = pathNode.getPointAtLength(total * 0.5);

        const warnGroup = s.append('g')
          .classed('warn-relation', true);

        warnGroup.append('circle')
          .attr('cx', point.x)
          .attr('cy', point.y)
          .attr('r', DEFAULT_STYLE.edge.controlRadius + 1)
          .style('stroke', WARN)
          .style('fill', DEFAULT_STYLE.edgeBg.stroke);

        warnGroup.append('path')
          .attr('d', EXCLAMATION_PATH)
          .attr('transform', `translate(${point.x - ICON_OFFSET_WARN + 0.5}, ${point.y - ICON_OFFSET_WARN})`)
          .style('fill', WARN);
      }
    });
  }

  /**
   * In this context, edge controls are used to denote
   * warnings, where the user-specified values conflicts with
   * automatically inferred valeus
   */
  // renderEdgeControls(selection: D3SelectionIEdge<EdgeParameter>) {
  //   this.chart.selectAll('.edge-control').selectAll('*').remove();

  //   const edgeControl = selection
  //     .filter(e => {
  //       const param = e.data.parameter;
  //       if (!param) {
  //         return false;
  //       }
  //       const inferred = decodeWeights(param.engine_weights[this.engine]);
  //       const current = decodeWeights(param.weights);

  //       // If inferred and current have different types
  //       if (inferred.weightType !== current.weightType) {
  //         return true;
  //       }

  //       if (Math.abs(inferred.weightValue - current.weightValue) > 0.5) {
  //         return true;
  //       }

  //       // If inferred and current have different polarity, Delphi only
  //       const polarity = e.data.polarity || 0;
  //       if (this.engine === 'delphi' || this.engine === 'delphi_dev') {
  //         const w = param.engine_weights[this.engine];
  //         if (w[2] && w[2] * polarity < 0) {
  //           return true;
  //         }
  //       }
  //       return false;
  //     })
  //     .select('.edge-control');

  //   // const EXCLAMATION_TRIANGLE = '\uf071';

  //   edgeControl
  //     .append('circle')
  //     .attr('r', DEFAULT_STYLE.edge.controlRadius + 2)
  //     .style('fill', DEFAULT_STYLE.edgeBg.stroke)
  //     .attr('stroke', WARN)
  //     .style('cursor', 'pointer');

  //   edgeControl
  //     .append('path')
  //     .attr('d', EXCLAMATION_PATH)
  //     .attr('transform', `translate(${-ICON_OFFSET}, ${-ICON_OFFSET})`)
  //     .style('fill', WARN);

  //   /*
  //   dgeControl
  //     .append('circle')
  //     .attr('r', DEFAULT_STYLE.edge.controlRadius)
  //     .style('fill', 'none')
  //     .style('cursor', 'pointer');

  //   edgeControl
  //     .append('text')
  //     .attr('x', () => {
  //       return -6;
  //     })
  //     .attr('y', () => {
  //       return 3.5;
  //     })
  //     .style('font-family', 'FontAwesome')
  //     .style('font-size', () => {
  //       return '12px';
  //     })
  //     .style('stroke', 'none')
  //     .style('fill', WARN)
  //     .style('cursor', 'pointer')
  //     .text(() => {
  //       return EXCLAMATION_TRIANGLE;
  //     });
  //   */
  // }

  // FIXME: Typescript
  renderHistoricalAndProjections(selectedScenarioId: string) {
    const chart = this.chart;

    chart.selectAll('.node-ui').each((datum: any, index, nodes) => {
      if (datum.nodes && datum.nodes.length > 0) return; // node has children

      const node = nodes[index];

      const nodeWidth = datum.width;
      const nodeHeight = datum.height;
      const nodeBodyGroup = d3.select(node).select('.node-body-group');

      d3.select(node).style('cursor', 'pointer');

      // Create historical/projection chart
      const nodeScenarioData = this.scenarioData[datum.label];

      nodeBodyGroup.select('.historic-graph').remove();
      nodeBodyGroup.select('.indicator-label').remove();
      const graphEl = nodeBodyGroup
        .append('g')
        .classed('historic-graph', true)
        .attr('transform',
          svgUtil.translate(
            PADDING_HORIZONTAL,
            nodeHeight -
              PADDING_BOTTOM -
              INDICATOR_NAME_SIZE -
              GRAPH_HEIGHT +
              GRAPH_VERTICAL_MARGIN
          )
        );

      nodeBodyGroup
        .append('text')
        .classed('indicator-label', true)
        .attr('x', PADDING_HORIZONTAL)
        .attr('y', nodeHeight - PADDING_BOTTOM)
        .attr('width', nodeWidth)
        .style('font-size', INDICATOR_NAME_SIZE + 'px')
        .attr('fill', INDICATOR_NAME_COLOR)
        .text(nodeScenarioData.indicator_name)
        .each(function (d: any) {
          svgUtil.truncateTextToWidth(
            this,
            d.width - (2 * PADDING_HORIZONTAL)
          );
        });

      // Add a shadow to nodes that have clamps for the currently selected scenario
      if (selectedScenarioId !== null) {
        const selectedScenario = nodeScenarioData.scenarios.find(s => s.id === selectedScenarioId);
        let filterEffect = null;
        if (selectedScenario && selectedScenario.constraints) {
          filterEffect = (selectedScenario.constraints.length > 0) ? 'url(#node-shadow)' : null;
        }
        d3.select(nodes[index]).attr('filter', filterEffect as any);
      }

      const runOptions = { selectedScenarioId };
      const renderOptions = {
        margin: {
          top: 0,
          bottom: PADDING_BOTTOM + INDICATOR_NAME_SIZE,
          left: 0,
          right: 0
        },
        width: nodeWidth - (PADDING_HORIZONTAL * 2) - (DEFAULT_STYLE.node.strokeWidth * 2),
        height: GRAPH_HEIGHT
      };

      renderHistoricalProjectionsChart(graphEl as any, nodeScenarioData, renderOptions, runOptions);
    });
  }
}
