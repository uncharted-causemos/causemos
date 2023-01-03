import _ from 'lodash';
import { nodeBlurScale, createLinearScale } from '@/utils/scales-util';
import { DEFAULT_COLOR } from '@/utils/colors-util';

/// /////////////////////////////////////////////////////////////////////////////
// A layout strategy consists of a sequence of "stages", each is capable of
// of performing stylistic and affine transforms on a set of nodes and edges.
//
// Each stage is composed of these actions:
// - extract: Defines a set of graphical elements that should undergo transformation
// - layout: Defines a layout specification
// - postLayout: Actions to perform once layout has finished
//
// At each stage a "cache" object is available to store and share data amongst stage
// actions, and amongst different stages if applicable.
//
/// /////////////////////////////////////////////////////////////////////////////

export function colaLayout(direction) {
  const stage = {
    id: 'cola',
    extract: (_cache, cy) => {
      // Hack - override width, height and background
      cy.batch(() => {
        const counts = cy.nodes().map((d) => d.data().count);
        const maxCount = Math.max(...counts);
        const minCount = Math.min(...counts);
        const sizeFn = createLinearScale([minCount, maxCount], [30, 80]); // Make the size range between 30 to 80

        cy.nodes().forEach((node) => {
          const groundingScore = node.data().groundingScore;
          const size = sizeFn(node.data().count);
          const halfSize = 0.5 * size;
          const blurriness = nodeBlurScale(groundingScore);
          const fillColor = DEFAULT_COLOR;

          node.data().style.width = size;
          node.data().style.height = size;

          if (groundingScore >= 1.0) {
            node.data().style['background-image'] = null;
          } else {
            const svg = `
              <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                <filter id="blur">
                  <feGaussianBlur stdDeviation="${blurriness}" />
                </filter>
                <g transform="translate(${halfSize}, ${halfSize})">
                  <circle cx="0"  cy="0" r="${halfSize}" fill="none" stroke="#888" stroke-width="1" />
                  <circle cx="0"  cy="0" r="${
                    halfSize - 1
                  }" fill="${fillColor}" filter="url(#blur)" />
                </g>
              </svg>
            `;

            node.data().style['background-image'] =
              'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
            node.data().style['background-color'] = 'white';

            cy.style().selector('node').update();
          }
        });
      });
      return cy.nodes();
    },
    layout: (/* selection, cache, cy */) => {
      return {
        name: 'cola',
        flow: {
          axis: direction || 'x',
          minSeparation: 20,
        },
        animate: true,
        randomize: false,
        tilingPaddingVertical: 20,
        tilingPaddingHorizontal: 30,
        nodeDimensionsIncludeLabels: true,
        maxSimulationTime: 300,
      };
    },
    postLayout(_selection, _cache, cy) {
      cy.edges().style({ display: null });
    },
  };
  return [stage];
}

/**
 * A rectangular layout that shows the node compositions
 */
export function coseBilkentLayout() {
  const stage = {
    id: 'coseBilkent',
    extract: (cache, cy) => {
      const edges = cy.edges().remove();
      cache.edges = edges;

      // Hack - override width, height and background
      cy.batch(() => {
        const counts = cy.nodes().map((d) => d.data().count);
        const maxCount = Math.max(...counts);
        const minCount = Math.min(...counts);
        const sizeFn = createLinearScale([minCount, maxCount], [30, 80]); // Make the size range between 30 to 80

        cy.nodes().forEach((node) => {
          const groundingScore = node.data().groundingScore;
          const size = sizeFn(node.data().count);
          const halfSize = 0.5 * size;
          const blurriness = nodeBlurScale(groundingScore);
          const fillColor = DEFAULT_COLOR;

          node.data().style.width = size;
          node.data().style.height = size;

          if (groundingScore >= 1.0) {
            node.data().style['background-image'] = null;
          } else {
            const svg = `
              <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                <filter id="blur">
                  <feGaussianBlur stdDeviation="${blurriness}" />
                </filter>
                <g transform="translate(${halfSize}, ${halfSize})">
                  <circle cx="0"  cy="0" r="${halfSize}" fill="none" stroke="#888" stroke-width="1" />
                  <circle cx="0"  cy="0" r="${
                    halfSize - 1
                  }" fill="${fillColor}" filter="url(#blur)" />
                </g>
              </svg>
            `;

            node.data().style['background-image'] =
              'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
            node.data().style['background-color'] = 'white';

            cy.style().selector('node').update();
          }
        });
      });
      return cy.nodes();
    },
    layout: (/* selection, cache, cy */) => {
      return {
        name: 'cose-bilkent',
        animate: true,
        randomize: false,
        tilingPaddingVertical: 20,
        tilingPaddingHorizontal: 30,
        nodeDimensionsIncludeLabels: true,
      };
    },
    postLayout(_selection, cache, cy) {
      cy.batch(() => {
        cache.edges.restore();
        // cache.edges.style({ display: 'none' });
      });
    },
  };
  return [stage];
}

/**
 * A circular layout provides that a graph overview
 * of the edges between nodes and their respective hierarchies.
 *
 * This layout is compatible with compound nodes.
 *
 * Layout tries to do the follow:
 * - Minimize edges crossing leaf-nodes and compound nodes.
 * - Minimize compound nodes overlaps amongst themselves
 *
 * To achieve the above points we lay the nodes along the circumference, so in essence
 * all edges are chords. Moreover, the nodes are pre-sorted in their hierarchical order
 * so when the compound nodes are created they are completely captured by the arc they
 * lie on, this reduces the overlap complexities.
 *
 * In addition, to better see edges of closely placed nodes, we alter the edge style
 * in a post procesing pass. Edges whose relative length falls below a threshold will
 * use "taxi" edges instead, this gives them a slightly more pronounced appearnce.
 */
export function circularBFSLayout(hideEdgesAfterRender = false) {
  return [
    {
      id: 'circularBFS',
      extract: (_cache, cy) => {
        const orderedNodes = _.sortBy(cy.nodes(), (node) => node.data().id);
        return cy.collection(orderedNodes);
      },
      layout: (/* selection, cache, cy */) => {
        return {
          name: 'breadthfirst',
          circle: true,
          spacingFactor: 4.5,
        };
      },
      postLayout(_selection, _cache, cy) {
        // Figure out approximate center
        let x = 0;
        let y = 0;
        const nonZeroNodes = cy.nodes().filter((node) => node.data().count > 0);
        const numNodes = nonZeroNodes.length;
        nonZeroNodes.forEach((node) => {
          x += node.position().x;
          y += node.position().y;
        });
        x /= numNodes;
        y /= numNodes;

        // Figure out radius
        const pos = nonZeroNodes[0].position();
        const r = Math.sqrt((pos.x - x) * (pos.x - x) + (pos.y - y) * (pos.y - y));

        const _dist = (p1, p2) => {
          return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
        };
        cy.batch(() => {
          cy.edges().forEach((edge) => {
            const sPosition = edge.source().position();
            const tPosition = edge.target().position();

            const dist = _dist(sPosition, tPosition);
            const adjacent = 0.5 * dist;
            const hypot = r;

            // if very short edge/chord just use haystack
            if (dist < 0.2 * r) {
              edge.style({
                'curve-style': 'haystack',
              });
              return;
            }

            const t = hypot * hypot - adjacent * adjacent;
            // if (t < 0) {
            //  console.log(`h=${hypot}, a=${adjacent}`);
            // }
            const opp = t < 0 ? 1 : Math.sqrt(t); // Quirky cases where radius calculation is not accurate

            // Use vector cross product to find winding direction
            const v1 = { x: tPosition.x - x, y: tPosition.y - y };
            const v2 = { x: sPosition.x - x, y: sPosition.y - y };
            const cross = v1.x * v2.y - v1.y * v2.x;
            const dir = cross < 0 ? 1 : -1;

            edge.style({
              'curve-style': 'unbundled-bezier',
              'control-point-weights': [0.5],
              'control-point-distances': [opp * dir],
            });
          });
          if (hideEdgesAfterRender) {
            cy.edges().style({ display: 'none' });
          }
        });
      },
    },
  ];
}

export function centralityLayout() {
  const CENTRALITY_TEST = [
    {
      id: 'compute_centrality',
      extract: (_cache, cy) => {
        const ccn = cy.elements().closenessCentralityNormalized({ directed: true });
        cy.nodes().forEach((n) => {
          n.data({
            ccn: ccn.closeness(n),
          });
        });
        return cy.elements();
      },
      layout: (/* selection, cache, cy */) => {
        return {
          name: 'random',
        };
      },
      postLayout(/* selection, cache, cy */) {},
    },
    {
      id: 'fade_out_nodes',
      extract: (_cache, cy) => {
        const nodesToRemove = cy.elements('node[ccn <= 0.7] ');
        return nodesToRemove;
      },
      layout: (/* selection, cache, cy */) => {
        return {
          name: 'cola',
        };
      },
      postLayout(selection /* cache, cy */) {
        selection.positions((ele) => {
          return ele.addClass('hidden');
        });
      },
    },
  ];
  return CENTRALITY_TEST;
}

export function testLayout() {
  const DC_GOAL = 0.65;
  const DC_TEST = [
    {
      id: 'circle1',
      extract: (_cache, cy) => {
        return cy.nodes().filter((d) => d.data().groundingScore > DC_GOAL);
      },
      layout: (/* selection, cache, cy */) => {
        return {
          name: 'circle',
          animate: true,
          boundingBox: { x1: 600, y1: 300, w: 400, h: 500 },
        };
      },
    },
    {
      id: 'circle2',
      extract: (_cache, cy) => {
        return cy.nodes().filter((d) => d.data().groundingScore <= DC_GOAL);
      },
      layout: (/* selection, cache, cy */) => {
        return {
          name: 'circle',
          animate: true,
          boundingBox: { x1: 0, y1: 300, w: 300, h: 300 },
        };
      },
    },
  ];
  return DC_TEST;
}
