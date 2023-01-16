import { IndexNodeType } from './Enums';

export interface WeightedNode {
  weight: number;
  isWeightUserSpecified: boolean;
}
export interface Dataset extends WeightedNode {
  type: IndexNodeType.Dataset;
  name: string;
  datasetId: string; // or datacubeId
  datasetName: string;
  isInverted: boolean;
  source: string;
  // And other metadata properties as needed
}

export interface Index extends WeightedNode {
  type: IndexNodeType.Index;
  name: string;
  inputs: (Dataset | Index)[];
}

export interface OutputIndex extends Node {
  type: IndexNodeType.OutputIndex;
  name: string;
  inputs: (Dataset | Index)[];
}

export type IndexNode = OutputIndex | Index | Dataset;
