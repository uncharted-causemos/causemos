import { DataState, ViewState } from '@/types/Insight';

// Defines the preservable analysis item states
export interface AnalysisItemState {
  // this is simply very similar to the Insight's view config
  viewConfig: ViewState;
  dataConfig: DataState;
}

export interface AnalysisItem extends AnalysisItemState {
  itemId: string; // unique uuid that uniquely identify this item
  id: string; // datacube-id, e.g., unique indicator id
  datacubeId: string; // datacub-family-id, e.g., indicator family id
  name?: string;
  selected?: boolean;
}

export interface AnalysisState {
  currentAnalysisId: string;
  analysisItems: AnalysisItem[];
  comparativeAnalysisViewSelection?: string;
}
