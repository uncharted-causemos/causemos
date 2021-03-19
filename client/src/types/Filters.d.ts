// WM search construct
export type ClauseField = String;
export type ClauseValue = String | Number | Array<Number>;
export type ClauseOperand = 'and' | 'or';
export type ClauseNegation = true | false;

export interface Clause {
  field: ClauseField,
  operand?: ClauseOperand,
  isNot?: ClauseNegation,
  values: ClauseValue[]
}

export interface Filters {
  clauses: Clause[]
}
