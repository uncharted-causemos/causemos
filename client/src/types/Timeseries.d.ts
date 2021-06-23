export interface TimeseriesPoint {
  value: number;
  timestamp: number;
}

export interface Timeseries {
  id: string;
  name: string;
  color: string;
  points: TimeseriesPoint[];
}
