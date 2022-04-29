import { SELECTED_COLOR } from '@/utils/colors-util';

export const DEFAULT_STYLE = {
  node: {
    fill: '#FFFFFF',
    stroke: '#999',
    strokeWidth: 0.5,
    borderRadius: 4,
    cursor: 'pointer',
    highlighted: {
      stroke: SELECTED_COLOR,
      borderRadius: 2,
      strokeWidth: 2
    },
    matched: SELECTED_COLOR
  },
  edge: {
    fill: 'none',
    strokeWidth: 5,
    controlRadius: 9,
    strokeDash: '3,2'
  },
  edgeBg: {
    fill: 'none',
    stroke: '#F2F2F2'
  },
  nodeHeader: {
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
    width: 20
  }
};

type PolaritySetting = {
  text: string;
  x: number;
  y: number;
  fontSize: string;
};
const opposite: PolaritySetting = { text: '\uf063', x: -3, y: 2.5, fontSize: '6.5px' };
const unknown: PolaritySetting = { text: '\uf128', x: -2.5, y: 3, fontSize: '8px' };
const same: PolaritySetting = { text: '\uf062', x: -3, y: 2.2, fontSize: '6.5px' };
const polaritySettingsMap = new Map<number, PolaritySetting>();
polaritySettingsMap.set(-1, opposite);
polaritySettingsMap.set(0, unknown);
polaritySettingsMap.set(1, same);

export {
  polaritySettingsMap
};
