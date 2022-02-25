import * as d3 from 'd3';
import _ from 'lodash';
import { AbstractCAGRenderer, D3SelectionINode, D3SelectionIEdge } from './abstract-cag-renderer';
import { NodeParameter, EdgeParameter } from '@/types/CAG';
import {
  INode, getAStarPath, simplifyPath, IEdge
} from 'svg-flowgraph';

import svgUtil, { translate } from '@/utils/svg-util';
import { SELECTED_COLOR, UNDEFINED_COLOR } from '@/utils/colors-util';
import { calcEdgeColor, scaleByWeight } from '@/utils/scales-util';
import { hasBackingEvidence } from '@/utils/graphs-util';
import { DEFAULT_STYLE, polaritySettingsMap } from './cag-style';
import { EdgeSuggestion } from '@/utils/relationship-suggestion-util';
import { createOrUpdateButton, SVG_BUTTON_STYLES } from '@/utils/svg-util-new';
import { D3Selection } from '@/types/D3';

const REMOVE_TIMER = 1000;

// TODO: can we access the original node size constants rather than copying
//  them here?
const NODE_WIDTH = 130;
const NODE_HEIGHT = 30;

const EDGE_SUGGESTION_WIDTH = 200;
const EDGE_SUGGESTION_SPACING = 10;


const pathFn = svgUtil.pathFn.curve(d3.curveBasis);
const distance = (a: {x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

interface EdgeSuggestionDisplayData {
  suggestion: EdgeSuggestion;
  x: number;
  y: number;
}

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

  /**
   * Creates or updates all UI related to in-situ suggestions.
   * @param suggestions The list of potential suggestions to present.
   * @param selectedSuggestions Displayed in a separate column
   * @param node Position UI relative to this. Other nodes will be faded out.
   * @param isLoading If `true`, a loading indicator will be displayed instead of `suggestions`.
   */
  setSuggestionData(
    suggestions: EdgeSuggestion[],
    selectedSuggestions: EdgeSuggestion[],
    node: INode<NodeParameter>,
    isShowingDriverEdges: boolean,
    isLoading: boolean
  ) {
    // Suggestion column starts to the left of the node if showing driver
    //  (incoming) edges, and starts to the right otherwise.
    const suggestionColumnX = isShowingDriverEdges
      ? node.x - EDGE_SUGGESTION_SPACING - EDGE_SUGGESTION_WIDTH
      : node.x + NODE_WIDTH + EDGE_SUGGESTION_SPACING;
    const { cancelButtonX, cancelButtonWidth } = this.renderStaticSuggestionUI(
      node,
      isShowingDriverEdges,
      suggestionColumnX
    );
    // Show(or update if it exists) the button for adding selected edges to CAG
    const { buttonSelection: addButton } = this.createOrUpdateAddButton(selectedSuggestions.length);
    const addButtonStartX = cancelButtonX + cancelButtonWidth + EDGE_SUGGESTION_SPACING;
    addButton.attr(
      'transform',
      translate(
        addButtonStartX,
        node.y
      )
    );
    this.renderSearchBox(suggestionColumnX, node.y, isShowingDriverEdges);
    this.renderSuggestionLoadingIndicator(
      isLoading,
      suggestionColumnX,
      node.y
    );
    this.renderEdgeSuggestions(
      suggestions,
      selectedSuggestions,
      suggestionColumnX,
      node.y,
      addButtonStartX,
      isShowingDriverEdges
    );
    this.setOtherNodesAndEdgesOpacity(node.id, 0.1);
  }

  setOtherNodesAndEdgesOpacity(nodeId: string, opacity: number) {
    this.chart.selectAll<any, INode<NodeParameter>>('.node-container')
      .style('opacity', node => node.id === nodeId ? 1 : opacity);
    this.chart.selectAll<any, IEdge<EdgeParameter>>('.edge-path')
      .style('opacity', opacity);
  }

  renderStaticSuggestionUI(
    node: INode<NodeParameter>,
    isShowingDriverEdges: boolean,
    suggestionColumnX: number
  ) {
    // Show a button for exiting suggestion mode
    const suggestionColumnWidth = EDGE_SUGGESTION_SPACING + EDGE_SUGGESTION_WIDTH;
    const cancelButtonX =
      node.x +
      NODE_WIDTH +
      EDGE_SUGGESTION_SPACING +
      (isShowingDriverEdges ? 0 : suggestionColumnWidth);
    const {
      buttonSelection: cancelButton,
      dynamicWidth: cancelButtonWidth
    } = createOrUpdateButton(
      'Cancel',
      'cancel-suggestion-mode-button',
      this.chart as unknown as D3Selection,
      // No click handler necessary, event will propagate to background
      () => {}
    );
    cancelButton.attr('transform', translate(cancelButtonX, node.y));
    // Remove label if it already exists
    (this.chart.node() as Element).querySelector(
      '.suggestion-column-label'
    )?.remove();
    // Render label for suggestion column
    this.chart.append('text')
      .classed('suggestion-column-label', true)
      .text(`Add ${isShowingDriverEdges ? 'drivers' : 'impacts'}`)
      .style('fill', 'grey')
      .style('font-weight', '600')
      .style('letter-spacing', '1.05')
      .style('text-transform', 'uppercase')
      .attr('transform', translate(
        suggestionColumnX,
        node.y - EDGE_SUGGESTION_SPACING
      ));
    return { cancelButtonX, cancelButtonWidth };
  }

  renderSuggestionLoadingIndicator(
    isLoading: boolean,
    suggestionColumnX: number,
    nodeY: number
  ) {
    this.chart.selectAll<any, boolean>('.suggestion-loading-indicator')
      .data(isLoading ? [true] : [])
      .join(
        enter => enter.append('text')
          .classed('suggestion-loading-indicator', true)
          .attr('transform', () =>
            translate(
              suggestionColumnX,
              nodeY + NODE_HEIGHT + EDGE_SUGGESTION_SPACING + 20
            )
          )
          .text('Loading suggestions...')
          .style('opacity', 0)
          .call(enter => enter.transition()
            .style('opacity', 1)
          ),
        update => update,
        exit => exit.remove()
      );
  }

  renderSearchBox(
    suggestionColumnX: number,
    nodeY: number,
    isShowingDriverEdges: boolean
  ) {
    const textInput = this.chart.selectAll('.suggestion-search-box')
      .data([isShowingDriverEdges])
      .join('foreignObject')
      .classed('suggestion-search-box', true)
      .attr('width', `${EDGE_SUGGESTION_WIDTH}px`)
      .attr('height', `${NODE_HEIGHT}px`)
      .attr('transform', translate(suggestionColumnX, nodeY))
      .selectAll('input')
      .data(isShowingDriverEdges => [isShowingDriverEdges])
      .join('xhtml:input')
      .attr('type', 'text')
      .style('width', `${EDGE_SUGGESTION_WIDTH}px`)
      .style('height', `${NODE_HEIGHT}px`)
      .style('border', '1px solid dodgerblue')
      .style('border-radius', '3px')
      .on('keyup', (event) => {
        this.emit('search-for-concepts', (event.target as any).value);
      })
      .on('click', (event) => {
        // Don't trigger background click handler
        event.stopPropagation();
      });
    (textInput.node() as HTMLInputElement).focus();
  }

  renderEdgeSuggestions(
    suggestions: EdgeSuggestion[],
    selectedSuggestions: EdgeSuggestion[],
    suggestionColumnX: number,
    nodeY: number,
    selectedColumnX: number,
    isShowingDriverEdges: boolean
  ) {
    const suggestionStartY = nodeY + NODE_HEIGHT + EDGE_SUGGESTION_SPACING;
    // Render all selectedSuggestions and up to 5 other suggestions
    const selectedSuggestionsToDisplay = selectedSuggestions.map((s, i) => ({
      suggestion: s,
      x: selectedColumnX,
      y: suggestionStartY + i * (NODE_HEIGHT + EDGE_SUGGESTION_SPACING)
    }));
    const otherSuggestionsToDisplay: EdgeSuggestionDisplayData[] = [];
    let i = 0;

    while (otherSuggestionsToDisplay.length < 5 && i < suggestions.length) {
      const suggestion = suggestions[i];
      const selectedSuggestionWithSameConcept = selectedSuggestions.find(
        selectedSuggestion => {
          return isShowingDriverEdges
            ? selectedSuggestion.source === suggestion.source
            : selectedSuggestion.target === suggestion.target;
        }
      );
      if (selectedSuggestionWithSameConcept === undefined) {
        // Suggestion is not already displayed in the selected column
        otherSuggestionsToDisplay.push({
          suggestion: suggestion,
          x: suggestionColumnX,
          y:
            suggestionStartY +
            otherSuggestionsToDisplay.length *
              (NODE_HEIGHT + EDGE_SUGGESTION_SPACING)
        });
      }
      i++;
    }
    const suggestionsToDisplay: EdgeSuggestionDisplayData[] = [
      ...selectedSuggestionsToDisplay,
      ...otherSuggestionsToDisplay
    ];
    const accessConcept = isShowingDriverEdges
      ? (entry: EdgeSuggestionDisplayData) => entry.suggestion.source
      : (entry: EdgeSuggestionDisplayData) => entry.suggestion.target;
    // Add a `g` to the dom for each suggestion, along with snazzy transitions
    const suggestionGroups = this.chart
      .selectAll<any, EdgeSuggestionDisplayData>('.node-suggestion')
      .data(suggestionsToDisplay, accessConcept)
      .join(
        enter => enter.append('g')
          .classed('node-suggestion', true)
          .style('cursor', 'pointer')
          .attr('transform', suggestion => translate(suggestion.x, suggestion.y + 10))
          .style('opacity', 0.5),
        update => update,
        exit => exit
          .call(exit => exit.transition()
            .style('opacity', 0)
            .remove()
          )
      )
      // Apply transition to all elements (enter & update & exit) to ensure
      //  that they all end up in full opacity at the right place. This
      //  addresses an issue where elements that were fading out and then
      //  re-added would keep their half-gone position and opacity values.
      .call(join => join.transition()
        .duration(100)
        .attr('transform', suggestion => translate(suggestion.x, suggestion.y))
        .style('opacity', 1)
      );
    // Render node background
    suggestionGroups.selectAll('rect')
      .data(d => [d])
      .join('rect')
      .attr('width', EDGE_SUGGESTION_WIDTH)
      .attr('height', NODE_HEIGHT)
      .attr('transform', translate(0, 0))
      .style('stroke', DEFAULT_STYLE.node.stroke)
      .style('fill', DEFAULT_STYLE.node.fill)
      .style('border-radius', DEFAULT_STYLE.node.borderRadius)
      .style('stroke-width', DEFAULT_STYLE.node.strokeWidth);
    // Render node label
    suggestionGroups.selectAll('text')
      .data(entry => [this.labelFormatter(accessConcept(entry))])
      .join('text')
      .attr('transform', translate(10, 20))
      .text(concept => concept)
      .each(function() {
        // FIXME any
        svgUtil.truncateTextToWidth(this as any, EDGE_SUGGESTION_WIDTH - 20);
      });
    // Render incoming edge arrowhead
    const arrowHeadX = isShowingDriverEdges ? EDGE_SUGGESTION_WIDTH - 5 : -5;
    suggestionGroups.selectAll('edge-possibility-indicator')
      .data(entry => [entry.suggestion.color])
      .join('svg:path')
      .classed('edge-possibility-indicator', true)
      .attr('d', svgUtil.ARROW)
      .attr('transform', translate(arrowHeadX, NODE_HEIGHT / 2) + ' scale(2.5)')
      .attr('fill', color => color)
      .style('pointer-events', 'none');
    // On click, toggle whether the node is selected
    suggestionGroups
      .on('mouseenter', function() {
        // Expand suggestions slightly on hover
        d3.select<any, EdgeSuggestionDisplayData>(this).transition()
          .duration(50)
          .attr('transform', ({ x, y }) => translate(x, y) + ' scale(1.05)');
      })
      .on('mouseleave', function() {
        d3.select<any, EdgeSuggestionDisplayData>(this).transition()
          .duration(50)
          .attr('transform', ({ x, y }) => translate(x, y));
      })
      .on('click', (event, entry) => {
        // Don't trigger background click handler
        event.stopPropagation();
        this.emit('toggle-suggestion-selected', entry.suggestion);
      })
      // Don't trigger double click handler that is used to create a new node
      .on('dblclick', (event) => {
        event.stopPropagation();
      });
  }

  createOrUpdateAddButton(selectedCount: number) {
    const text = `Add ${selectedCount} relationship${
      selectedCount !== 1 ? 's' : ''
    }`;
    const addRelationshipsButton = createOrUpdateButton(
      text,
      'add-relationships-button',
      this.chart as unknown as D3Selection,
      (event: any) => {
        // Don't trigger background click handler
        event.stopPropagation();
        this.emit('add-selected-suggestions');
      },
      SVG_BUTTON_STYLES.PRIMARY
    );
    return addRelationshipsButton;
  }

  exitSuggestionMode() {
    this.chart.selectAll('.suggestion-search-box').remove();
    this.chart.selectAll('.add-relationships-button').remove();
    this.chart.selectAll('.cancel-suggestion-mode-button').remove();
    this.chart.selectAll('.suggestion-column-label').remove();
    this.chart.selectAll('.node-suggestion').remove();
    this.chart.selectAll('.suggestion-loading-indicator').remove();
    // Clicking the right handle shows possible edges on existing nodes
    this.chart.selectAll('.edge-possibility-indicator').remove();
    // Restore all nodes to full opacity
    this.setOtherNodesAndEdgesOpacity('_invalid_node_id', 1);
  }

  renderNodesAdded(selection: D3SelectionINode<NodeParameter>) {
    selection
      .append('rect')
      .classed('node-container-outer', true)
      .attr('x', -3)
      .attr('y', -3)
      .attr('rx', DEFAULT_STYLE.node.borderRadius + 3)
      .attr('width', d => (d.width + 6) || 0)
      .attr('height', d => (d.height + 6) || 0)
      .style('stroke', DEFAULT_STYLE.node.stroke)
      .style('stroke-width', DEFAULT_STYLE.node.strokeWidth)
      .style('cursor', 'pointer')
      .style('display', 'none')
      .style('fill', DEFAULT_STYLE.node.fill);

    selection
      .filter(d => d.data.components.length > 1)
      .selectAll<any, INode<NodeParameter>>('.node-container-outer')
      .style('display', null);

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

    selection.append('g').classed('node-handles', true);
  }

  renderNodesUpdated(selection: D3SelectionINode<NodeParameter>) {
    selection
      .filter(d => d.data.components.length > 1)
      .selectAll<any, INode<NodeParameter>>('.node-container-outer')
      .style('display', null);

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
    const control = node.selectAll('.node-control')
      .data([node.datum()])
      .join('g')
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
    const leftHandle = node.select('.node-handles').append('g');
    const rightHandle = node.select('.node-handles').append('g');

    const nodeWidth = node.datum().width || 0;
    const nodeHeight = node.datum().height || 0;
    const handleWidth = DEFAULT_STYLE.nodeHandles.width;

    node.selectAll('.node-container, .node-container-outer')
      .style('border-radius', DEFAULT_STYLE.node.highlighted.borderRadius)
      .style('stroke', DEFAULT_STYLE.node.highlighted.stroke)
      .style('stroke-width', DEFAULT_STYLE.node.highlighted.strokeWidth);

    node.select('path')
      .attr('transform', svgUtil.translate(handleWidth * 2, handleWidth));

    const handleWidthPlusPadding = handleWidth + 5;
    node.select('.node-label')
      .attr('x', handleWidthPlusPadding)
      .text(d => this.labelFormatter(d.label))
      .each(function (d) { svgUtil.truncateTextToWidth(this as any, d.width - handleWidthPlusPadding * 2); });

    const addHandleElements = (
      handleGroupSelection: d3.Selection<
        SVGGElement,
        INode<NodeParameter>,
        null,
        any>,
      xOffset: number
    ) => {
      // Add invisible rect to detect mouse events
      handleGroupSelection.append('rect')
        .classed('handle', true)
        .attr('x', xOffset)
        .attr('y', 0)
        .attr('width', handleWidth)
        .attr('height', nodeHeight)
        .style('cursor', 'pointer')
        .style('fill', 'transparent');
      // Add arrow
      const approximateArrowWidth = 10;
      handleGroupSelection.append('text')
        .attr('x', xOffset + (handleWidth - approximateArrowWidth) / 2)
        .attr('y', nodeHeight * 0.625)
        .style('font-family', 'FontAwesome')
        .style('font-size', '12px')
        .style('stroke', 'none')
        .style('fill', 'grey')
        .style('pointer-events', 'none')
        .text('\uf061');
    };

    addHandleElements(leftHandle, 0);
    addHandleElements(rightHandle, nodeWidth - handleWidth);

    const onHandleHover = (mouseEvent: any) => {
      // mouseEvent.target is rect.handle, parentNode is g element that
      //  contains rectangle and text element
      const gElement = d3.select(mouseEvent.target.parentNode);
      gElement.select('rect').style('fill', SELECTED_COLOR);
      gElement.select('text').style('fill', 'black');
    };

    const onHandleLeave = (mouseEvent: any) => {
      // mouseEvent.target is leftHandle or rightHandle g element
      const gElement = d3.select(mouseEvent.target);
      gElement.select('rect').style('fill', 'transparent');
      gElement.select('text').style('fill', 'grey');
    };

    leftHandle.on('mouseover', onHandleHover);
    leftHandle.on('mouseleave', onHandleLeave);
    rightHandle.on('mouseover', onHandleHover);
    rightHandle.on('mouseleave', onHandleLeave);


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

        // Hiding(removing) node handles here means that no click event will be
        //  sent, so in-situ suggestions cannot be triggered. As a workaround,
        //  remove the handles after a tick once the click handler has executed
        setTimeout(this.hideNodeHandles.bind(this), 0);
        this.resetDragState();

        // remove edge indicators
        const indicators = d3.selectAll('.edge-possibility-indicator');
        indicators
          .transition()
          .duration(300)
          .style('opacity', 0)
          .remove();

        this.handleBeingDragged = false;
        if (_.isNil(sourceNode) || _.isNil(targetNode)) return;
        this.temporaryNewEdge = { sourceNode, targetNode };

        this.emit('new-edge', {
          source: sourceNode.data,
          target: targetNode.data
        });
      });
    rightHandle
      .call(drag as any)
      .on('click', (event) => {
        this.emit('fetch-suggested-edges', node.datum(), false);
        // Don't open the side panel
        event.stopPropagation();
      });
    leftHandle
      .on('click', (event) => {
        this.emit('fetch-suggested-edges', node.datum(), true);
        // Don't open the side panel
        event.stopPropagation();
      });
  }

  // FIXME Typescript weirdness
  hideNodeHandles() {
    const chart = this.chart;
    const nodes = chart.selectAll<SVGGElement, INode<NodeParameter>>('.node');

    nodes.select('.node-container')
      .attr('width', (d) => d.width)
      .attr('x', 0);

    nodes.selectAll('.node-container:not(.node-selected), .node-container-outer')
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
