import { DataState, ViewState } from '@/types/Insight';

// Defines the preservable analysis item states
export interface AnalysisItemState {
  // this is simply very similar to the Insight's view config
  viewConfig: ViewState;
  dataConfig: DataState;
}

export interface AnalysisItem extends AnalysisItemState {
  // Generally a UUID that uniquely identifies one instance of a datacube in the
  //  analysis. However, under some circumstances this can be the the datacube's
  //  `id` or `data_id`. In those cases a UUID is not required to uniquely
  //  identify the instance.
  itemId: string;

  // Uniquely identifies a model or indicator's metadata document in ES.
  // Cannot be used to fetch data directly.
  id: string;

  // When combined with an output feature, can be used to fetch timeseries data.
  // Indicators in the same "collection"/"dataset" share a `dataId`, but differ
  //  by feature.
  // In DOJO, these are all grouped into one "indicator".
  // FIXME: rename to dataId to match the rest of the app
  datacubeId: string;

  name?: string;
  selected?: boolean;
}

export interface AnalysisState {
  currentAnalysisId: string;
  analysisItems: AnalysisItem[];
  comparativeAnalysisViewSelection?: string;
}
