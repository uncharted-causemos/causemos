export interface TimeseriesPoint {
  value: number;
  timestamp: number;
}
export interface Timeseries {
  id: string;
  name: string;
  color: string;
  points: TimeseriesPoint[];
  isDefaultRun: boolean;
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
  name: string; timeseries: TimeseriesPoint[];
}
