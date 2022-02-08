
export interface BarData {
  name: string; // e.g., the axis tick name
  label: string; // e.g., region name which will be shown on hover
  value: number;
  normalizedValue: number;
  color?: string;
  opacity?: number;
}
