import { IndexNodeType } from './Enums';

export interface BaseNode {
  id: string;
  name: string;
}
export interface WeightedNode {
  weight: number;
  isWeightUserSpecified: boolean;
}
export interface Placeholder extends BaseNode {
  type: IndexNodeType.Placeholder;
}
export interface Dataset extends BaseNode, WeightedNode {
  type: IndexNodeType.Dataset;
  // equivalent to `data_id` (see `Datacube.d.ts`) or `datacubeId` (see
  //  `Analysis.d.ts/AnalysisItem`)
  datasetId: string;
  // equivalent to `id` (see `Analysis.d.ts/AnalysisItem`)
  datasetMetadataDocId: string;
  datasetName: string;
  isInverted: boolean;
  source: string;
  selectedTimestamp: number;
}

export interface DatasetSearchResult {
  displayName: string;
  datasetMetadataDocId: string;
  dataId: string;
  description: string;
  period: { gte: number; lte: number };
  familyName: string;
}

export interface Index extends BaseNode, WeightedNode {
  type: IndexNodeType.Index;
  inputs: (Dataset | Index | Placeholder)[];
}

export interface OutputIndex extends BaseNode {
  type: IndexNodeType.OutputIndex;
  inputs: (Dataset | Index | Placeholder)[];
}

export type IndexNode = OutputIndex | Index | Dataset | Placeholder;
export type IndexWorkBenchItem = Index | Dataset | Placeholder;
export type ParentNode = OutputIndex | Index;

// If a node is selected, this is the node's ID
// If an edge is selected, this contains the IDs of the edge's source and target nodes.
export type SelectableIndexElementId = string | { sourceId: string; targetId: string };

/**
 * Used to summarize a given dataset's contribution to a specific country.
 */
export interface IndexResultsContributingDataset {
  /**
   * A number in the range [0, 100].
   *  The percentage of the country's result value that comes from this dataset.
   */
  overallWeight: number;
  /** The dataset node in question. */
  dataset: Dataset;
  /**
   * The normalized value of the country within the dataset.
   *  A value of null means the country was not found in the dataset.
   */
  datasetValue: number | null;
  /** `datasetValue` multiplied by `overallWeight` */
  weightedDatasetValue: number | null;
}

export interface IndexResultsData {
  countryName: string;
  /**
   * The country's overall value.
   *  A value of null means the country was not found in one or more datasets.
   */
  value: number | null;
  contributingDatasets: IndexResultsContributingDataset[];
}

/**
 * Contains enough information to render index nodes in a CSS grid
 */
export interface GridCell {
  node: IndexNode;
  startRow: number;
  rowCount: number;
  startColumn: number;
  hasOutputLine: boolean;
  isLastChild: boolean;
}
