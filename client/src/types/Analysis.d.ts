import { DataState, ViewState } from '@/types/Insight';

// Defines the preservable analysis item states
export interface AnalysisItemState {
  // this is simply very similar to the Insight's view config
  viewConfig: ViewState;
  dataConfig: DataState;
}

export interface AnalysisItem extends AnalysisItemState {
  id: string;
  datacubeId: string;
  name?: string;
  selected?: boolean;
}

export interface AnalysisState {
  currentAnalysisId: string;
  analysisItems: AnalysisItem[];
  comparativeAnalysisViewSelection?: string;
}
