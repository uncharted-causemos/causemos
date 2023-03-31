export interface DojoParagraphDetails {
  query: string;
  matches: string[];
}

export interface DojoParagraphMetadata {
  match_score: number;
}
export interface DojoParagraphHighlight {
  text: string;
  highlight: boolean;
}
export interface DojoParagraphHighlights {
  highlights: [DojoParagraphHighlight[]];
}
