/**
 * Interfaces for Jataware symantec search endpoint (dojo)
 */
export interface Snippet {
  documentId: string | null;
  text: string;
  documentTitle: string;
  documentAuthor: string;
  documentSource: string;
}

export interface MatchScore {
  match_score: number;
}
export interface FoundParagraphs {
  id: string;
  text: string;
  document_id: string;
  metadata: MatchScore;
  length: number;
}
export interface ParagraphSearchResponse {
  hits: number;
  items_in_page: number;
  scroll_id: string;
  results: FoundParagraphs[];
}

export interface Document {
  creation_date: string | null;
  mod_date: string | null;
  type: string | null;
  description: string | null;
  original_language: string | null;
  classification: string | null;
  title: string | null;
  producer: string | null;
  stated_genre: string | null;
  uploaded_at: string | null;
  processed_at: string | null;
  author: string | null;
  pages: number;
  creator: string | null;
  id: string;
}
