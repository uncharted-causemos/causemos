
import ModelPublishingStepID from './ModelPublishingTypes';

export interface SnapshotInsightDetails {
  name: string;
  description: string;
  analyticalQuestion: string;
  // screenshot
}

export interface UseCase {
  spatialAggregation: string;
  temporalAggregation: string;
  viz_type: string[];
  TemporalResolution: string;
  filterBy?: any;
  groupBy?: any;
  snapshotDetails: SnapshotInsight;
  relevantModelRuns?: any;
  transform?: any;
  default: boolean; // used for knowing default viz config when no use case is selected
}

export interface ModelPublishingStep {
  id: ModelPublishingStepID;
  completed: boolean;
  text: string;
}
