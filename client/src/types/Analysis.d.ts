export interface AnalysisItemFilter {
  range: { min: number; max: number };
  global: boolean;
}
export interface RunOutputSelection {
  runId: string;
  timestamp: number;
}
// Defines the preservable analysis item states
export interface AnalysisItemState {
  id: string;
  datacubeId: string;
  modelId: string;
  outputVariable: string;
  selection?: RunOutputSelection;
  filter?: AnalysisItemFilter[];
}
export interface AnalysisItem extends AnalysisItemState {
  model: string;
  source: string;
  units: string;
  outputDescription: string;
}

export interface AnalysisItemNew {
  id: string;
  datacubeId: string;
}

export interface AlgebraicTransform {
  name?: string;
  maxInputCount?: number;
}
export interface AnalysisState {
  currentAnalysisId: string;
  analysisItems: AnalysisItem[];
  timeSelectionSyncing: boolean;
  mapBounds: MapBounds;
  algebraicTransform: AlgebraciTransform;
  algebraicTransformInputIds: string[];
}
