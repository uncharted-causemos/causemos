import _ from 'lodash';
import { SELECTED_COLOR, GRAPH_BACKGROUND_COLOR } from '@/utils/colors-util';
/* A listing of WM graph styles compatible with cytoscape 3.8+ */

/* Styles applied to the Events view graph */
export const WM_SEPT2019 = [
  {
    selector: ':parent',
    style: {
      label: (node) => {
        const label = node.data().label;
        if (node.data().count > 0) return `${label}\n\uf111`;
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
      'background-color': GRAPH_BACKGROUND_COLOR,
      color: '#808080',
    },
  },
  {
    selector: ':childless',
    css: {
      'background-color': (node) => {
        return node.data().style['background-color'];
      },
      'background-image': (node) => {
        const bg = node.data().style['background-image'];
        if (_.isNil(bg)) return [];
        return bg;
      },
      color: 'black',
      'background-opacity': 0.7,
      label: 'data(label)',
      'min-zoomed-font-size': '10px',
      'text-max-width': '80px',
      'text-wrap': 'wrap',
      'text-outline-width': '1.5px',
      'text-outline-color': 'white',
      width: (node) => {
        if (node.data().style.width) {
          return node.data().style.width;
        }
        return Math.sqrt(node.data().count) * 2.0;
      },
      height: (node) => {
        if (node.data().style.height) {
          return node.data().style.height;
        }
        return Math.sqrt(node.data().count) * 2.0;
      },
    },
  },
  {
    selector: '.hidden',
    style: {
      opacity: '0.2',
    },
  },
  {
    selector: 'edge',
    style: {
      'text-outline-width': '1.5px',
      'text-outline-color': 'white',
      'min-zoomed-font-size': '10px',
      'line-style': (edge) => {
        return edge.data().style.edgeStyle;
      },
      'target-arrow-color': (edge) => {
        return edge.data().style.edgeColor;
      },
      'line-color': (edge) => {
        return edge.data().style.edgeColor;
      },
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'source-endpoint': 'outside-to-line',
      'target-endpoint': 'outside-to-line',
      'target-distance-from-node': '8px',
      opacity: (edge) => {
        return edge.data().style.opacity;
      },
    },
  },
  {
    selector: ':active',
    style: {
      'overlay-color': SELECTED_COLOR,
    },
  },
  {
    selector: ':selected[count > 0]',
    style: {
      color: 'black', // For better readability
      'font-weight': 'bold',
      'font-size': '20px',
      'border-color': SELECTED_COLOR,
      'border-width': '4px',
      opacity: 1,
      'min-zoomed-font-size': '0px',
    },
  },
  {
    selector: '.hidden-label',
    style: {
      label: '',
    },
  },
];
