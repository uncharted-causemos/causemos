interface StatefulDataNode {
  name: string;
  children: StatefulDataNode[];
  bars: { color: string; value: number }[];
  path: string[];
  isExpanded: boolean;
}

// The root of the tree. Imitates the structure of a real node
//  to simplify the recursive functions used to traverse the tree
interface RootStatefulDataNode {
  children: StatefulDataNode[];
}

interface ChecklistRowData {
  name: string;
  bars: { color: string; value: number }[];
  isExpanded: boolean;
  isChecked: boolean;
  path: string[];
  isSelectedAggregationLevel: boolean;
  showExpandToggle: boolean;
  indentationCount: number;
  hiddenAncestorNames: string[];
}
