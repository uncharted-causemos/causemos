
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
