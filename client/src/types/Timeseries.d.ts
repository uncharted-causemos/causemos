export interface TimeseriesPoint {
  value: number;
  timestamp: number;
}

export interface Timeseries {
  color?: string;
  points: TimeseriesPoint[];
}
