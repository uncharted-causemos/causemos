import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import {
  IndexProjection,
  IndexProjectionScenario,
  IndexProjectionSettings,
  ProjectionConstraint,
} from '@/types/Index';
import { COLORS } from './colors-util';
import { ProjectionTimeseries } from '@/types/Timeseries';

export const NO_COUNTRY_SELECTED_VALUE = '';

const TIMESERIES_COLORS = ['#000', ...COLORS];
export const MAX_NUM_TIMESERIES = TIMESERIES_COLORS.length;

export const getAvailableTimeseriesColor = (usedColors: string[]) =>
  TIMESERIES_COLORS.filter((color) => !usedColors.includes(color)).shift();

const defaultScenario: IndexProjectionScenario = {
  id: uuidv4(),
  name: 'No constraints',
  description: 'No concepts are constrained in this scenario.',
  color: TIMESERIES_COLORS[0],
  isVisible: true,
  isDefault: true,
  constraints: {},
};

/**
 * Create a new index projection settings with default values
 */
export const createNewIndexProjectionSettings = (): IndexProjectionSettings => {
  return {
    scenarios: [defaultScenario],
    isSingleCountryModeActive: true,
    selectedCountry: NO_COUNTRY_SELECTED_VALUE,
    selectedCountries: [
      { name: NO_COUNTRY_SELECTED_VALUE, color: TIMESERIES_COLORS[0] },
      { name: NO_COUNTRY_SELECTED_VALUE, color: TIMESERIES_COLORS[1] },
    ],
  };
};

export const createNewScenario = (
  name = 'Untitled scenario',
  description: string,
  color: string,
  constraints: { [nodeId: string]: ProjectionConstraint[] } = {}
) => {
  const newScenario: IndexProjectionScenario = {
    id: uuidv4(),
    name,
    description,
    color: color,
    isVisible: true,
    isDefault: false,
    constraints: constraints,
  };
  return newScenario;
};

/**
 * Get the array of projection timeseries for the node with given nodeId
 * @param projections a projection list
 * @param nodeId node id
 */
export const getProjectionsForNode = (projections: IndexProjection[], nodeId: string) => {
  const projectionTimeseries: ProjectionTimeseries[] = projections.map((p) => {
    return {
      id: `${p.id}_${nodeId}`,
      name: p.name,
      color: p.color,
      points: p.result[nodeId] || [],
    };
  });
  return projectionTimeseries;
};
