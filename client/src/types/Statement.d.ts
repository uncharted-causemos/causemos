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

/* Statement related */
export interface Factor {
  adjectives: Array<string>,
  candidates: Array<ConceptMatchCandidate>,
  concept: string,
  concept_score: number,
  factor: string,
  geo_context: any, // FIXME
  polarity: number,
  time_context: any, // FIXME

  // Compositional
  theme?: string,
  theme_property?: string,
  process?: string,
  process_property?: string
}

export interface Statement {
  subj: Factor,
  obj: Factor,
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



/* Basic graph */
