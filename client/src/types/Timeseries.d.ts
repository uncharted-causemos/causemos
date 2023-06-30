import { IncompleteDataCorrectiveAction, ProjectionPointType } from '@/types/Enums';

export interface TimeseriesPoint {
  value: number;
  normalizedValue?: number;
  timestamp: number;
}

export interface TimeseriesPointProjected extends TimeseriesPoint {
  projectionType: ProjectionPointType;
}
export interface TimeseriesDistributionPoint {
  values: number[];
  timestamp: number;
}

export interface ProjectionTimeseries {
  id: string;
  name: string;
  color: string;
  points: TimeseriesPointProjected[];
}

export interface Timeseries {
  id: string;
  name: string;
  color: string;
  points: TimeseriesPoint[];
  isDefaultRun: boolean;
  correctiveAction?: IncompleteDataCorrectiveAction;
}

/**
 * Contains all of the information to distinguish between timeseries points at a given timestamp.
 * * isTimestampInTimeseries is included to indicate occurrences where one of the timeseries
 * doesn't have a point at the selected timestamp.
 */
export interface TimeseriesPointSelection {
  timeseriesId: string;
  scenarioId: string;
  timestamp: number;
  isTimestampInTimeseries: boolean;
  timeseriesName: string;
  color: string;
}

export interface QualifierTimeseriesResponse {
  name: string;
  timeseries: TimeseriesPoint[];
}

export interface SparklineData {
  series: number[];
  name: string;
  color: string;
}

/**
 * Old data: datasets that have 5 or fewer points for the selected country after the projection start date
 * Insufficient data: datasets that have 5 or fewer points for the selected country
 *
 * true indicates an error
 */
export interface DataWarning {
  oldData: boolean;
  insufficientData: boolean;
}

export interface ByCountryWarning {
  country: string;
  nodeId: string;
  warning: DataWarning;
}
