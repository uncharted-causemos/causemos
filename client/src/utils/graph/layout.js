'use strict';

import ArrayUtil from '../array-util';
import { groupEdges } from './data';
import { COLLAPSED_NODE_CLASS } from './styles.js';

export const LAYOUTS = Object.freeze({
  // COSE: 'cose',
  // COSE_BILKENT_AGGREGATED: 'cose-bilkent-aggregated',
  COSE_BILKENT: 'cose-bilkent',
  COLA: 'cola'
  // SPREAD: 'spread'
});

export const LAYOUT_LABELS = Object.freeze({
  // [LAYOUTS.COSE_BILKENT_AGGREGATED]: 'Overview',
  [LAYOUTS.COLA]: 'Causality Flow',
  [LAYOUTS.COSE_BILKENT]: 'Ontology Clarity'
  // [LAYOUTS.SPREAD]: 'Spread'
});

export const COLA_FLOWS = [
  { id: 'cola-x', value: 'x', name: 'Horizontal' },
  { id: 'cola-y', value: 'y', name: 'Vertical' }
];

const NODE_PADDING = 75;

class LayoutManager {
    cy = null;
    _setLayout = null;
    constructor(cy, setLayout) {
      this.cy = cy;
      this._setLayout = setLayout;
    }

    setLayout(opts = {}) {
      this._setLayout(opts);
    }

    getLayoutParameters(layoutOption, layout) {
      const universalParams = {
        name: layoutOption,
        animate: true,
        randomize: false,
        tilingPaddingVertical: NODE_PADDING,
        tilingPaddingHorizontal: NODE_PADDING * 2,
        fit: true,
        nodeDimensionsIncludeLabels: false
      };
      if (layoutOption === LAYOUTS.COLA) {
        return Object.assign(
          universalParams,
          {
            // causes all edges not involved in a cycle (strongly connected component) to have a
            // separation constraint generated between their source and sink, with a minimum spacing
            // set to 150. Specifying the 'x' axis achieves a left-to-right flow layout.
            flow: { axis: layout.direction, minSeparation: NODE_PADDING * 2 },
            avoidOverlap: true,
            handleDisconnected: true,
            nodeSpacing: (/* node */) => { return 25; }
          }
        );
      } else {
        return Object.assign(universalParams);
      }
    }

    toggleInterventions(showInterventions) {
      const interventions = this.cy.$('.intervention-nodes');
      if (showInterventions) {
        interventions.removeClass('hidden');
      } else {
        interventions.addClass('hidden');
      }
    }

    rollupInterventions() {
      const cy = this.cy;
      cy.batch(() => {
        const interventionNodes = cy.$('.intervention-nodes');
        const interventionDepth = Math.max(...interventionNodes.map((node) => {
          return node.id().split('/').length;
        })) - 1;
        const nodeIds = interventionNodes.map(node => node.id());
        const parentIds = ArrayUtil.uniq(nodeIds.map(id => {
          const lastSlash = id.lastIndexOf('/');
          return id.substr(0, lastSlash);
        }));
        const interventionEdges = interventionNodes.incomers().union(interventionNodes.outgoers()).edges();

        // TODO: move child count summing to build hierarchy step and do at all levels
        parentIds.forEach(id => {
          let count = 0;
          const parent = cy.nodes(`[id="${id}"]`);
          cy.nodes(`[id^="${id}"]`).forEach(child => {
            count += child.data('count');
          });
          parent
            .data('count', count)
            .addClass('interventionParent');
        });

        interventionEdges.addClass('hidden');
        cy.add(groupEdges(interventionEdges, interventionDepth));
        const parents = cy.$('.interventionParent');
        const api = cy.expandCollapse('get');

        parents.forEach(parent => {
          api.collapse(parent);
        });
      });
    }

    updateOpacity(edgeOpacity = 0.45) {
      const cy = this.cy;
      if (cy.edges().length > 0) {
        cy.edges()
          .style({
            opacity: edgeOpacity
          });
      }
    }

    updateLabels(labelFlag) {
      const nodes = this.cy.nodes(':childless');
      if (!labelFlag) {
        nodes.addClass('hidden-label');
      } else {
        nodes.removeClass('hidden-label');
      }
    }

    expandAll() {
      const cy = this.cy;
      cy.expandCollapse('get').expandAll();
      cy.fit();
    }

    collapseAll() {
      const cy = this.cy;
      cy.expandCollapse('get').collapseAll();
      cy.fit();
    }

    expand(nodes) {
      const cy = this.cy;
      const sortedNodes = nodes.sort((n1, n2) => n1.id().split('/').length < n2.id().split('/').length);
      sortedNodes.forEach(node => {
        cy.expandCollapse('get').expand(node);
        this.afterExpand(node);
      });
      cy.fit();
    }

    collapse(nodes) {
      const cy = this.cy;
      const sortedNodes = nodes.sort((n1, n2) => n1.id().split('/').length > n2.id().split('/').length);
      sortedNodes.forEach(node => {
        cy.expandCollapse('get').collapse(node);
        this.afterCollapse(node);
      });
      cy.fit();
    }

    aggregateEdges(hierarchyDepth) {
      const cy = this.cy;
      cy.edges('.aggregate').remove();
      const edges = cy.edges();
      const layoutParams = {
        name: LAYOUTS.COSE_BILKENT,
        animate: true,
        randomize: false,
        tilingPaddingVertical: NODE_PADDING,
        tilingPaddingHorizontal: NODE_PADDING * 2,
        nodeDimensionsIncludeLabels: false
      };

      cy.batch(() => {
        edges.remove();
        cy.layout(layoutParams).run();
        if (hierarchyDepth > 1) {
          const aggregateEdges = groupEdges(edges, hierarchyDepth);
          cy.add(aggregateEdges);
        }
        edges.addClass('hidden').restore();
      });
    }

    beforeCollapse(node) {
      const counter = [];
      this.cy.batch(() => {
        // TODO: move style assignent to node creation
        if (node.descendants('.intervention-nodes, .interventionParent').length > 0) {
          node.addClass('interventionParent');
        }

        node.descendants().forEach(descendant => {
          if (descendant.isChildless()) {
            const count = descendant.data().count + (descendant.data().aggregateCount || 0);
            counter.push(count);
          }
        });
      });

      return [counter];
    }

    afterCollapse(node, layoutOption, hierarchyDepth) {
      const cy = this.cy;
      // Aggregate edges are created to the collapsed node, one incoming and one outgoing, if necessary
      // All edges to children of the collapsed node are hidden.
      // Aggregate edges are calculated by looking only at the raw graph edges. The ".aggregate" is applied to
      // distinguish edges that exist in the data from those created as UI artifacts . It is possible to calculate
      // based on aggregate edges and only look one level deep, but I'm choosing instead to always look at the real
      // information rather than derived counts
      let edgesAdded = cy.collection();
      const incomers = node.incomers().edges().addClass('hidden');
      const outgoers = node.outgoers().edges().addClass('hidden');
      const incomersArray = incomers.not('.aggregate').map(o => o.data());
      const outgoersArray = outgoers.not('.aggregate').map(o => o.data());
      const targetLevel = node.id().split('/').length;
      if (incomersArray.length) {
        edgesAdded = edgesAdded.union(cy.add(groupEdges(incomersArray, targetLevel)));
      }
      if (outgoersArray.length) {
        edgesAdded = edgesAdded.union(cy.add(groupEdges(outgoersArray, targetLevel)));
      }
      if (layoutOption === LAYOUTS.COSE_BILKENT_AGGREGATED && targetLevel > hierarchyDepth) {
        edgesAdded.addClass('hidden');
      }
      edgesAdded.addClass('aggregate');
    }

    afterExpand(node) {
      const cy = this.cy;
      // In the case of collapsed children nodes becoming visible after expand, selecting the correct edges to reveal is
      // not as simple as matching source and target IDs because the expand/collapse plugin reveals the edges to all
      // children of a collapsed node as pointing to the collapsed node. This is the purpose of utilizing codirectedEdges
      // and choosing the edge with the largest count
      const descendantEdges = node.descendants().connectedEdges();
      const duplicateEdges = descendantEdges.codirectedEdges();
      const chosenEdges = {};
      duplicateEdges.forEach(edge => {
        const key = edge.data().source + '-' + edge.data().target;

        if (!chosenEdges[key]) {
          chosenEdges[key] = edge;
        } else if (chosenEdges[key].data().count < edge.data().count) {
          chosenEdges[key] = edge;
        }
      });

      // Show edges of revealed descendants
      const collapsedNeighbours = node.closedNeighbourhood(`.${COLLAPSED_NODE_CLASS}`).not('.hidden');
      const notCollapsedNeighbours = node.closedNeighbourhood().difference(`.${COLLAPSED_NODE_CLASS}`).not('.hidden');
      const edgesToNotCollpasedNeighbours = node.edgesWith(notCollapsedNeighbours).nodes().not('.hidden');
      edgesToNotCollpasedNeighbours.filter('.aggregate').remove();
      Object.keys(chosenEdges).forEach(key => {
        chosenEdges[key].removeClass('hidden');
      });
      descendantEdges.not(duplicateEdges).removeClass('hidden');

      // Recreate aggregate links to revealed collapsed nodes
      collapsedNeighbours.forEach(neighbourNode => {
        const targetLevel = neighbourNode.id().split('/').length;
        const groundedDescendantEdges = neighbourNode.descendants().edgesWith(node.descendants().union(node)).not('.aggregate');
        cy.add(groupEdges(groundedDescendantEdges.incomers().map(o => o.data()), targetLevel));
        cy.add(groupEdges(groundedDescendantEdges.outgoers().map(o => o.data()), targetLevel));
      });

      node.connectedEdges('.hidden').not('.aggregate').removeClass('hidden');
      cy.remove(node.connectedEdges('.aggregate').not('.hidden'));
    }
}

export default LayoutManager;
