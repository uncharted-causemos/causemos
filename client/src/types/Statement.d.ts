/* INDRA statement/document related */
interface ConceptMatchCandidate {
  name: string,
  score: number,

  // Compositional
  theme?: string,
  theme_property?: string,
  process?: string,
  process_property?: string
}

interface DateObj {
  date: string,
  day: number,
  month: number,
  year: number
}

/* Statement related */
export interface Factor {
  adjectives: Array<string>,
  candidates: Array<ConceptMatchCandidate>,
  concept: string,
  concept_score: number,
  factor: string,
  geo_context?: {
    location: {
      lat: number,
      lon: number
    },
    name: string
  },
  polarity: number,
  time_context?: {
    end: DateObj,
    start: DateObj
  },
  // Compositional
  theme?: string,
  theme_property?: string,
  process?: string,
  process_property?: string
}

export interface DocumentContext {
  doc_id: string,
  author: string | null,
  document_source: string | null,
  file_type: string,
  ner_analytics: {
    loc: string[],
    org: string[]
  },
  publication_date: DateObj,
  publisher_name: string | null,
  title: string | null
}

export interface EvidenceContext {
  agents_text: string[],
  contradiction_words: string[],
  hedging_words: string[],
  source_api: string,
  source_hash: number,
  text: string
}

export interface Statement {
  belief: number,
  evidence: {
    document_context: DocumentContext,
    evidence_context: EvidenceContext
  } [],
  id: string,
  modified_at: number,
  obj: Factor,
  subj: Factor,
  wm: {
    contradiction_category: number,
    edge: string,
    edited: number,
    min_grounding_score: number,
    num_contradictions: number,
    num_evidence: number,
    readers: Array<number>,
    readers_evidence_count: { [key: string]: number },
    state: number,
    statement_polarity: number
  },
  __factor: string // Hack for temporary aggregation-util key
}
