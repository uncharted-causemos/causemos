import { SELECTED_COLOR } from '@/utils/colors-util';

// Orange
const SELECTABLE_REGION_STYLE = Object.freeze({
  color: '#ffae19',
  borderWidth: 1,
  fillColor: '#e69f00',
  fillOpacity: 0.6
});

const SELECTED_REGION_STYLE = Object.freeze({
  color: SELECTED_COLOR,
  borderWidth: 1,
  fillColor: SELECTED_COLOR,
  fillOpacity: 0.6
});

// Grey
const UNSELECTED_REGION_STYLE = Object.freeze({
  color: '#808080',
  weight: 1,
  fillColor: '#808080',
  fillOpacity: 0.6
});

const COLOR_BOUNDING_BOX = '#888';

const TOOLTIP_OPTIONS = {
  direction: 'top',
  className: 'marker-tooltip'
};

export default {
  TOOLTIP_OPTIONS,
  SELECTABLE_REGION_STYLE,
  SELECTED_REGION_STYLE,
  UNSELECTED_REGION_STYLE,
  COLOR_BOUNDING_BOX
};
