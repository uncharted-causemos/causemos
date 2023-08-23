import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import {
  IndexProjection,
  IndexProjectionScenario,
  IndexProjectionSettings,
  ProjectionConstraint,
  ProjectionRunInfoNode,
  IndexProjectionNodeDataWarning,
} from '@/types/Index';
import { COLORS } from './colors-util';
import { ProjectionTimeseries, TimeseriesPoint } from '@/types/Timeseries';
import { ForecastMethodSelectionReason } from './forecast';
import { ProjectionDataWarning } from '@/types/Enums';
import dateFormatter from '@/formatters/date-formatter';

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
    showDataOutsideNorm: false,
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
    color,
    isVisible: true,
    isDefault: false,
    constraints,
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
      projectionId: p.id,
      name: p.name,
      color: p.color,
      points: p.result[nodeId] || [],
    };
  });
  return projectionTimeseries;
};

/**
 * Get the array of historical timeseries for the node with given nodeId
 * @param historicalData historical data
 * @param nodeId node id
 */
export const getHistoricalDataForNode = (
  historicalData: { [countryName: string]: { [nodeId: string]: TimeseriesPoint[] } },
  nodeId: string
) => {
  return Object.entries(historicalData).map(([countryName, hData]) => {
    return {
      countryName,
      points: hData[nodeId] ?? [],
    };
  });
};

/**
 * Get the array of constraints for the node with given nodeId
 * @param scenarios projection scenarios. Note that scenario id is same as corresponding projection id
 * @param nodeId node id
 */
export const getConstraintsForNode = (scenarios: IndexProjectionScenario[], nodeId: string) => {
  return scenarios.map((scenario) => {
    return {
      scenarioId: scenario.id,
      constraints: scenario.constraints[nodeId] ?? [],
    };
  });
};

/** Data quality warning utilities  */

const WARNING_INSUFFICIENT_DATA_MINCOUNT = 5;
const WARNING_OLD_DATA_MINCOUNT = 5;

const testOldData = (points: TimeseriesPoint[], projectionStartTimestamp: number): boolean => {
  if (points.length === 0) return false;
  return (
    points.filter((point: TimeseriesPoint) => point.timestamp >= projectionStartTimestamp).length <=
    WARNING_OLD_DATA_MINCOUNT
  );
};

const testInsufficientData = (points: TimeseriesPoint[]): boolean => {
  return points.length <= WARNING_INSUFFICIENT_DATA_MINCOUNT;
};

const testNoPattern = (runInfo: ProjectionRunInfoNode): boolean => {
  return 'reason' in runInfo && runInfo.reason === ForecastMethodSelectionReason.NoPattern;
};

const createOldDataWarningMessage = (timeseries: TimeseriesPoint[]) => {
  if (timeseries.length === 0) return '';
  const mostRecentDate = timeseries[timeseries.length - 1].timestamp;
  return `The most recent data point is from ${dateFormatter(
    mostRecentDate,
    'MMMM YYYY'
  )}. The gap since that point may cause projections to be unreliable.`;
};

const createInsufficientDataWarningMessage = (timeseries: TimeseriesPoint[]) => {
  return `The time series contains ${timeseries.length} data point${
    timeseries.length === 1 ? '' : 's'
  }. More points will make it easier to identify and extend trends.`;
};

const createNoPatternWarningMessage = () => {
  return `The time series doesn’t follow a reproducible pattern. Simple trend projections are displayed. Actual observed future values may differ significantly.`;
};

export const checkProjectionWarnings = (
  projectionData: IndexProjection[],
  historicalDataByProjectionId: { [projectionId: string]: { [nodeId: string]: TimeseriesPoint[] } },
  targetPeriod: { start: number; end: number }
): { [nodeId: string]: IndexProjectionNodeDataWarning[] } => {
  const allProjectionWarnings: IndexProjectionNodeDataWarning[] = [];
  projectionData.forEach((projection) => {
    // Check warnings from historical data
    const historicalData = historicalDataByProjectionId[projection.id] ?? {};
    Object.entries(historicalData).forEach(([nodeId, timeseries]) => {
      if (testOldData(timeseries, targetPeriod.start)) {
        allProjectionWarnings.push({
          nodeId,
          projectionId: projection.id,
          color: projection.color,
          warning: ProjectionDataWarning.OldData,
          message: createOldDataWarningMessage(timeseries),
        });
      }
      if (testInsufficientData(timeseries)) {
        allProjectionWarnings.push({
          nodeId,
          projectionId: projection.id,
          color: projection.color,
          warning: ProjectionDataWarning.InsufficientData,
          message: createInsufficientDataWarningMessage(timeseries),
        });
      }
    });
    // Check warnings from projection
    Object.entries(projection.runInfo).forEach(([nodeId, info]) => {
      if (testNoPattern(info)) {
        allProjectionWarnings.push({
          nodeId,
          projectionId: projection.id,
          color: projection.color,
          warning: ProjectionDataWarning.NoPatternDetected,
          message: createNoPatternWarningMessage(),
        });
      }
    });
  });

  return _.groupBy(allProjectionWarnings, 'nodeId');
};
