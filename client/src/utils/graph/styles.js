import * as d3 from 'd3';
import { nodeOpacityScale, nodeBlurScale, nodeColorScale } from '@/utils/scales-util.js';
import { INTERVENTION_COLOR, SELECTED_COLOR, BORDER_COLOR, FADED_COLOR } from '@/utils/colors-util.js';
import { THRESHOLD_SCORE, LOW_SCORE_OUTLINE } from '@/utils/nodes-styles';

export const COLLAPSED_NODE_CLASS = 'cy-expand-collapse-collapsed-node';

export function arrayStyles(minCountGroundedNodes, maxCountGroundedNodes, minCountLinks, maxCountLinks, nodeCount, edgeOpacity) {
  const maxFontSize = nodeCount > 12 ? 36 : 18;
  const minFontSize = Math.floor(maxFontSize * 0.7);
  const arrowScale = nodeCount > 36 ? 2 : 1;
  // thick bezier curves look funny on small graphs
  const maxEdgeWidth = nodeCount > 36 ? Math.ceil(nodeCount / 6) + 2 : 5;
  if (minCountLinks === maxCountLinks) {
    maxCountLinks++;
  }
  // FIXME: This scale should probably also be used for collapsed nodes
  const nodeSizeScale = d3.scaleLog().domain([minCountGroundedNodes, maxCountGroundedNodes]).range([17, 50]);

  return [
    {
      selector: 'node',
      style: {
        'font-size': `mapData(count, ${minCountGroundedNodes}, ${maxCountGroundedNodes},${minFontSize},${maxFontSize})`,
        'label': 'data(label)'
      }
    }, {
      selector: ':childless',
      style: {
        'background-color': 'white',
        'label': function(ele) {
          return ele.data().label.split('/').pop();
        },
        'text-outline-width': '1.5px',
        'text-outline-color': 'white',
        'text-max-width': '50px',
        'text-wrap': 'wrap',
        'min-zoomed-font-size': '20px',
        'color': 'black',
        'background-image': function(ele) {
          const groundingScore = ele.data().groundingScore;
          let count = ele.data().count;
          if (count === 0) {
            count = minCountGroundedNodes;
          }
          const size = nodeSizeScale(count);
          const halfSize = size / 2;
          const opacity = nodeOpacityScale(groundingScore);
          const blurriness = nodeBlurScale(groundingScore);
          const color = nodeColorScale(groundingScore);

          const filter = groundingScore < 1 && groundingScore > THRESHOLD_SCORE ? `<filter id="blur">
            <feGaussianBlur stdDeviation="${blurriness}" />
          </filter>` : '';
          const filterReference = groundingScore < 1 && groundingScore > THRESHOLD_SCORE ? 'url(#blur)' : '';
          const stroke = groundingScore < THRESHOLD_SCORE ? BORDER_COLOR : '';
          const strokeWidth = groundingScore < THRESHOLD_SCORE ? LOW_SCORE_OUTLINE.strokeWidth : '';
          const svg = `<svg width="${size}" height="${size}"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink">
            ${filter}
              <g transform="translate(${halfSize}, ${halfSize})">
                  <circle cx="0"  cy="0" r="${halfSize}" fill="${color}" fill-opacity="${opacity}" filter="${filterReference}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
              </g>
            </svg>`;
          return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        },
        'width': function(ele) {
          let count = ele.data().count;
          if (count === 0) {
            count = minCountGroundedNodes;
          }
          return nodeSizeScale(count);
        },
        'height': function(ele) {
          let count = ele.data().count;
          if (count === 0) {
            count = minCountGroundedNodes;
          }
          return nodeSizeScale(count);
        }
      }
    }, {
      selector: '.hovered:childless',
      style: {
        label: 'data(label)'
      }
    }, {
      selector: '.search-term-match',
      style: {
        'min-zoomed-font-size': '0px',
        'font-weight': 'bold'
      }
    }, { // Collapsed nodes should look like parent nodes
      selector: `node.${COLLAPSED_NODE_CLASS}`,
      style: {
        'label': 'data(collapsedLabel)',
        'background-opacity': 0.3,
        'border-width': '1px',
        'border-color': BORDER_COLOR,
        'shape': 'rectangle',
        'min-height': 30,
        'min-width': 30,
        'width': `mapData(aggregateCount,${minCountGroundedNodes},${maxCountGroundedNodes},30,100)`,
        'height': `mapData(aggregateCount,${minCountGroundedNodes},${maxCountGroundedNodes},30,100)`
      }
    }, {
      selector: `.${COLLAPSED_NODE_CLASS}.interventionParent`,
      style: {
        'background-color': function(ele) {
          if (ele.id().includes('/interventions')) {
            return INTERVENTION_COLOR;
          }
          return 'white';
        }
      }
    }, {
      selector: 'node[id ^= "wm/concept/causal_factor/intervention"]',
      style: {
        'background-image': function(ele) {
          const count = ele.data().count;
          const groundingScore = ele.data().groundingScore;
          const size = nodeSizeScale(count);
          const halfSize = size / 2;
          const opacity = nodeOpacityScale(groundingScore);
          const blurriness = nodeBlurScale(groundingScore);

          const svg = `<svg width="${size}" height="${size}"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink">
            <filter id="blur">
              <feGaussianBlur stdDeviation="${blurriness}" />
            </filter>
            <g transform="translate(${halfSize}, ${halfSize})">
                <circle cx="0"  cy="0" r="${halfSize}" fill="${INTERVENTION_COLOR}" fill-opacity="${opacity}" filter="url(#blur)" />
            </g>
          </svg>`;
          return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        }
      }
    }, {
      selector: ':parent',
      style: {
        'label': (node) => {
          const label = node.data().label;
          return label;
        },
        'text-outline-width': '1.5px',
        'text-outline-color': 'white',
        'text-margin-y': (node) => {
          if (node.data().count > 0) return '8px';
          return '0px';
        },
        'text-wrap': 'wrap',
        'font-family': 'FontAwesome, Helvetica Neue',
        'background-opacity': 0.333,
        'background-color': '#FFFFFF',
        'color': '#808080'
      }
    }, {
      selector: ':parent[count > 0]',
      style: {
        label: (node) => {
          const label = node.data().label;
          return `${label}\n\uf111`;
        },
        color: 'black'
      }
    }, {
      selector: ':child',
      style: {
        'background-opacity': 0.7
      }
    }, {
      selector: '.hidden',
      style: {
        display: 'none'
      }
    }, {
      selector: '.faded-label',
      style: {
        color: FADED_COLOR
      }
    },
    {
      selector: '.hidden',
      style: {
        display: 'none'
      }
    }, {
      selector: ':selected',
      style: {
        'color': SELECTED_COLOR,
        'font-weight': 'bold',
        'border-color': SELECTED_COLOR,
        'border-width': '3px',
        'label': 'data(label)',
        'line-color': SELECTED_COLOR,
        'opacity': 1,
        'target-arrow-color': SELECTED_COLOR,
        'min-zoomed-font-size': '0px'
      }
    }, {
      selector: ':selected[count > 0]',
      style: {
        label: (node) => {
          const label = node.data().label;
          if (node.isParent()) {
            return `${label}\n\uf111`;
          } else return label;
        }
      }
    }, {
      selector: 'node.hovered',
      style: {
        'borderColor': '#0089a4',
        'color': '#0089a4',
        'min-zoomed-font-size': '0px'
      }
    }, {
      selector: 'edge',
      style: {
        'color': 'black',
        'line-style': 'data(linkStyle)',
        'opacity': edgeOpacity,
        'text-outline-width': '1.5px',
        'text-outline-color': 'white',
        'label': 'data(count)',
        'curve-style': 'bezier',
        'source-endpoint': 'outside-to-line',
        'target-endpoint': 'outside-to-line',
        'target-distance-from-node': '8px',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': 'data(linkColor)',
        'arrow-scale': arrowScale,
        'font-size': `mapData(count,${minCountGroundedNodes}, ${maxCountGroundedNodes},12,18)`,
        'width': `mapData(count, ${minCountLinks}, ${maxCountLinks}, 2, ${maxEdgeWidth})`,
        'line-color': 'data(linkColor)',
        'min-zoomed-font-size': '8px'
      }
    }, {
      selector: '.edge-hovered',
      style: {
        'line-color': '#0089a4',
        'target-arrow-color': '#0089a4',
        'min-zoomed-font-size': '0px'
      }
    }, {
      selector: '.edge-selected',
      style: {
        'target-arrow-color': SELECTED_COLOR,
        'line-color': SELECTED_COLOR,
        'opacity': 1,
        'min-zoomed-font-size': '0px'
      }
    }, {
      selector: 'edge.meta',
      style: {
        'curve-style': 'bezier',
        'control-point-distances': '0 0 0'
      }
    }, {
      selector: 'node.highlight',
      style: {
        'background-image-opacity': '1',
        'min-zoomed-font-size': '0px'
      }
    }, {
      selector: 'edge.highlight',
      style: {
        opacity: '1'
      }
    }, {
      selector: 'node.semitransp',
      style: { 'background-image-opacity': '0.15' }
    }, {
      selector: 'edge.semitransp',
      style: { opacity: '0.15' }
    }
  ];
}

export default {
  COLLAPSED_NODE_CLASS
};
