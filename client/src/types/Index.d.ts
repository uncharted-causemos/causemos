import { IndexNodeType } from './Enums';

export interface BaseNode {
  id: string;
  name: string;
}
export interface WeightedNode {
  weight: number;
  isWeightUserSpecified: boolean;
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
  inputs: (Dataset | Index)[];
}

export interface OutputIndex extends BaseNode {
  type: IndexNodeType.OutputIndex;
  inputs: (Dataset | Index)[];
}

export type IndexNode = OutputIndex | Index | Dataset;
export type ParentNode = OutputIndex | Index;
