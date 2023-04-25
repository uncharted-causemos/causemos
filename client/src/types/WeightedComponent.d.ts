import type { ConceptNode } from './Index';

// This interface needs to be extracted to its own file to use TypeScript 3.8's "import type"
//  feature, which lets us avoid the circular dependency errors caused by ConceptNode requiring
//  WeightedComponent and vice versa.

interface WeightedComponent {
  componentNode: ConceptNode;
  isOppositePolarity: boolean;
  weight: number;
  isWeightUserSpecified: boolean;
}
