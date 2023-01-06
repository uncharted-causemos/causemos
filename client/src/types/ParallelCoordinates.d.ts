export interface ParallelCoordinatesOptions {
  width: number;
  height: number;
  showBaselineDefaults?: boolean;
  initialDataSelection?: Array<string>; // array of IDs to be selected once the PC is rendered
  newRunsMode: boolean;
}
