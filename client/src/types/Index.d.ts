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
  datasetId: string; // or datacubeId
  datasetName: string;
  isInverted: boolean;
  source: string;
  // And other metadata properties as needed
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
