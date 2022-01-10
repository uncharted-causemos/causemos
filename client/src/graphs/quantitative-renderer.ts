import * as d3 from 'd3';
import { NodeParameter, EdgeParameter, NodeScenarioData } from '@/types/CAG';
import { SELECTED_COLOR } from '@/utils/colors-util';
import svgUtil from '@/utils/svg-util';
import { calcEdgeColor, scaleByWeight } from '@/utils/scales-util';
import { hasBackingEvidence } from '@/utils/graphs-util';
import { AbstractCAGRenderer, D3SelectionINode, D3SelectionIEdge } from './abstract-cag-renderer';
import renderHistoricalProjectionsChart from '@/charts/scenario-renderer';
import { DEFAULT_STYLE, polaritySettingsMap } from './cag-style';

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

export class QuantitativeRenderer extends AbstractCAGRenderer<NodeParameter, EdgeParameter> {
  scenarioData: ScenarioData = {};

  constructor(options: any) {
    super(options);
    console.log('Quantitative Renderer');

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
    });

    this.on('node-mouse-leave', () => {
      svgUtil.hideSvgTooltip(this.chart);
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

  setScenarioData(scenarioData: ScenarioData) {
    this.scenarioData = scenarioData;
  }

  renderNodesAdded(selection: D3SelectionINode<NodeParameter>) {
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
      .style('fill', DEFAULT_STYLE.nodeHeader.fill)
      .style('stroke', DEFAULT_STYLE.nodeHeader.stroke)
      .style('stroke-width', DEFAULT_STYLE.nodeHeader.strokeWidth);

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

  renderNodesUpdated(selection: D3SelectionINode<NodeParameter>) {
    console.log(selection);
  }

  renderNodesRemoved(selection: D3SelectionINode<NodeParameter>) {
    console.log(selection);
  }

  renderEdgesAdded(selection: D3SelectionIEdge<EdgeParameter>) {
    console.log(selection);
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
    console.log(selection);
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
