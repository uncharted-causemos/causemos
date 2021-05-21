// Project metadata
export interface Project {
  id: string;
  kb_id: string;
  name: string;
  ontology: string | null;
  corpus_id: string | null;
  extended_at: number;
  modified_at: number;
  created_at: number;
  stat: { [key: string]: string | number };
}

export interface ModelGeography {
  country: string[];
  admin1: string[];
  admin2: string[];
  admin3: string[];
}

// any scenario data is represented as a map of {name, value}
export interface ScenarioData {
  [key: string]: string | number;
}

// TODO: Refactor aggregation-checklist-pane to use flattened data
//  type and remove these interfaces
export interface LegacyBreakdownNode {
  name: string;
  value: number;
  children: LegacyBreakdownNode[];
}

export interface LegacyBreakdownDataStructure {
  maxDepth?: number;
  data: LegacyNode;
  name?: string;
}
export interface AnalysisMapFilter {
  id: string;
  range: AnalysisMapRange;
}
export interface AnalysisMapRange {
  min: number;
  max: number;
}
