import { DatacubeType } from '@/types/Enums';

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

export interface DomainProject {
  id?: string;
  name: string; // corresponds to a datacube family (family_name)
  description: string;
  modified_at?: number;
  created_at?: number;
  source: string;
  type: DatacubeType; // e.g., model, indicator
  ready_instances: string[];
  draft_instances: string[];
}

// Side panel
export interface SidePanelTab {
  name: string;
  icon?: string;
  imgSrc?: string;
  isGreyscale?: string;
  badgeCount?: string;
}


export interface KnowledgeBase {
  id: string;
  name: string;
  ontology: string;
  created_at: number;
  corpus_id: string;
  corpus_index: string;
  corpus_parameter: any;
}

export interface DatacubeGeography {
  country: string[];
  admin1: string[];
  admin2: string[];
  admin3: string[];
}

export interface DatacubePeriod {
  gte: number;
  lte: number;
}

// any scenario data is represented as a map of {name, value}
export interface ScenarioData {
  [key: string]: string | number;
}

export interface AnalysisMapFilter {
  id: string;
  range: AnalysisMapRange;
}
export interface AnalysisMapRange {
  min: number;
  max: number;
}
