import { COLOR } from '@/utils/colors-util';
import { DataConfig } from '@/types/Datacube';
import { DiscreteOuputScale } from '@/types/Enums';
import type { WeightedComponent } from '@/types/WeightedComponent';

export interface DatasetSearchResult {
  displayName: string;
  dataId: string;
  outputName: string;
  description: string;
  familyName: string;
}

interface AttachedDataset {
  datasetName: string;
  isInverted: boolean;
  source: string;
  config: DataConfig;
  projectionAlgorithm: ProjectionAlgorithm;
}

interface BaseConceptNode {
  id: string;
  name: string;
  isOutputNode: boolean;
}

interface ConceptNodeWithoutDataset extends BaseConceptNode {
  components: WeightedComponent[];
}

interface ConceptNodeWithDatasetAttached extends BaseConceptNode {
  dataset: AttachedDataset;
}

type ConceptNode = ConceptNodeWithDatasetAttached | ConceptNodeWithoutDataset;

export type IndexEdgeId = { sourceId: string; targetId: string };
// If a node is selected, this is the node's ID
// If an edge is selected, this contains the IDs of the edge's source and target nodes.
export type SelectableIndexElementId = string | IndexEdgeId;

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
  dataset: ConceptNodeWithDatasetAttached;
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
 * Index results settings object
 */
export interface IndexResultsSettings {
  color: COLOR;
  colorScale: DiscreteOuputScale;
  numberOfColorBins: number;
}

/**
 * Contains enough information to render index nodes in a CSS grid
 */
export interface GridCell {
  node: ConceptNode;
  /** 1-indexed integer, since the first row of CSS-grid can be accessed with `grid-row-start: 1` */
  startRow: number;
  /** An integer, greater than 0, that indicates how many rows this cell spans vertically. */
  rowCount: number;
  /**
   * In all usages (as of Feb 15, 2023), startColumn is a negative number and cells are laid out
   * right to left.
   */
  startColumn: number;
  hasOutputLine: boolean;
  isLastChild: boolean;
  isOppositePolarity: boolean;
}

// =============  Index Projection ===============-

/**
 * An object representing a clamp
 */
export interface IndexProjectionConstraint {
  timestamp: number;
  value: number;
}

/**
 * An object representing an index projection scenario
 */
export interface IndexProjectionScenario {
  id: string;
  name: string;
  description: string;
  isVisible: boolean;
  color: string;
  isDefault: boolean;
  constraints: { [nodeId: string]: IndexProjectionConstraint[] };
}

/**
 * Index projection settings object
 */
export interface IndexProjectionSettings {
  scenarios: IndexProjectionScenario[];
}
