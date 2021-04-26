
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

export interface BreakdownInfo {
  name: string;
  data: {
      name: string;
      value: number;
      children: {
          name: string;
          value: number;
      }[];
  };
}
