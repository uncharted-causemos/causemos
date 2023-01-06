import { FieldMap, field, searchable } from './lex-util';

/**
 * Configures field attributes, determines how they are displayed and their search semantics
 *
 * Note lexType and baseType defines the value translation needed to go to/from LEX. LEX by default
 * uses string-types while fields can have heterogeneous types.
 */
export const CODE_TABLE: FieldMap = {
  // Subject specific
  SUBJ_ADJECTIVES: {
    ...field('subjAdjectives', 'Cause Adjectives'),
  },
  SUBJ: {
    ...field('subjFactor', 'Cause Name'),
  },
  SUBJ_CONCEPT: {
    ...field('subjConcept', 'Cause Grounding'),
    ...searchable('Cause', false),
  },
  SUBJ_CONCEPT_SCORE: {
    ...field('subjConceptScore', 'Cause Grounding Score'),
  },
  SUBJ_POLARITY: {
    ...field('subjPolarity', 'Cause Polarity'),
  },

  // Object specific
  OBJ_ADJECTIVES: {
    ...field('objAdjectives', 'Effect Adjectives'),
  },
  OBJ: {
    ...field('objFactor', 'Effect Name'),
  },
  OBJ_CONCEPT: {
    ...field('objConcept', 'Effect Grounding'),
    ...searchable('Effect', false),
  },
  OBJ_CONCEPT_SCORE: {
    ...field('objConceptScore', 'Effect Grounding Score'),
  },
  OBJ_POLARITY: {
    ...field('objPolarity', 'Effect Polarity'),
  },

  // Factor level
  POLARITY: {
    ...field('factorPolarity', 'Polarity'),
    ...searchable('Polarity', false),
    baseType: 'integer',
    lexType: 'string',
  },
  SCORE: {
    ...field('minGroundingScore', 'Grounding Score'),
    ...searchable('Grounding Score', true),
  },
  TOPIC: {
    ...field('topic', 'Concept', 'fa-sitemap'),
    ...searchable('Concept', false),
  },

  // Statement level
  TYPE: {
    ...field('type', 'Type'),
  },
  SENTENCES: {
    ...field('sentences', 'Evidence Text'),
  },
  READERS: {
    ...field('reader', 'Readers', 'fa-book'),
    ...searchable('Readers', false),
  },
  STATEMENT_POLARITY: {
    ...field('statementPolarity', 'Statement Polarity'),
    ...searchable('Statement Polarity', false),
    baseType: 'integer',
    lexType: 'string',
  },
  BELIEF: {
    ...field('belief', 'Belief Score'),
    ...searchable('Belief Score', true),
  },
  NUM_EVIDENCES: {
    ...field('numEvidence', 'Pieces of Evidence', 'fa-file-text'),
    ...searchable('Pieces of Evidence', true),
  },
  GEO_LOCATION_NAME: {
    ...field('factorLocationName', 'Evidence Locations', 'fa-globe'),
    ...searchable('Evidence Locations', false),
  },
  YEAR: {
    ...field('factorYear', 'Temporal - Year'),
    ...searchable('Temporal - Year', true),
  },
  MONTH: {
    ...field('factorMonth', 'Temporal - Month'),
    ...searchable('Temporal - Month', true),
  },
  KEYWORD: {
    ...field('keyword', 'Keyword'),
    ...searchable('Keyword', false),
  },
  CONTRADICTION_CATEGORY: {
    ...field('contradictionCategory', 'Refuting Evidence'),
    ...searchable('Refuting Evidence', false),
    baseType: 'integer',
    lexType: 'string',
  },
  QUALITY: {
    ...field('quality', 'Quality Checking'),
    ...searchable('Quality Checking', false),
  },

  // EVIDENCE_SOURCE: {
  //   ...field('evidenceSource', 'Evidence Source'),
  //   ...searchable('Evidence Source', false)
  // },
  HEDGING_CATEGORY: {
    ...field('hedgingCategory', 'Hedging'),
    ...searchable('Hedging', false),
    baseType: 'integer',
    lexType: 'string',
  },
  EDGE: {
    ...field('edge', 'Relations'),
    ...searchable('Relations', false),
  },

  // Document level
  DOC_ID: {
    ...field('docId', 'Document Id'),
    ...searchable('Document Id', false),
  },
  DOC_FILE_TYPE: {
    ...field('docFileType', 'File type'),
    ...searchable('File type', false),
  },
  DOC_PUBLICATION_YEAR: {
    ...field('docPublicationYear', 'Publication Year'),
    ...searchable('Publication Year', false),
    baseType: 'integer',
    lexType: 'string',
  },
  META_CORPUS: {
    ...field('meta_corpus', 'Corpus'),
    ...searchable('Corpus', false),
  },
  DOC_AUTHOR: {
    ...field('docAuthor', 'Author'),
    ...searchable('Author', false),
  },
  DOC_LOCATION: {
    ...field('docLocation', 'Document Locations'),
    ...searchable('Document Locations', false),
  },
  DOC_ORGANIZATION: {
    ...field('docOrganization', 'Organization'),
    ...searchable('Organization', false),
  },
  DOC_STANCE: {
    ...field('docStance', 'Stance'),
    ...searchable('Stance', false),
  },
  DOC_SENTIMENT: {
    ...field('docSentiment', 'Sentiment'),
    ...searchable('Sentiment', false),
  },
  DOC_LABEL: {
    ...field('docLabel', 'Document Tags'),
    ...searchable('Document Tags', false),
  },
  DOC_BYOD_TAG: {
    ...field('docByodTag', 'Document Corpora'),
    ...searchable('Document Corpora', false),
  },
  DOC_GENRE: {
    ...field('docGenre', 'Document Genre'),
    ...searchable('Document Genre', false),
  },
};

// Map of constant to underlying data field
export const FIELDS = Object.keys(CODE_TABLE).reduce(
  (acc: { [key: string]: string }, key: string) => {
    acc[key] = CODE_TABLE[key].field;
    return acc;
  },
  {}
);

export const CONTRADICTION = Object.freeze({
  ALL_SUPPORTING: 0,
  SOME_REFUTING: 1,
  ALL_REFUTING: 2,
});

export const CONTRADICTION_MAP = Object.freeze({
  [CONTRADICTION.ALL_SUPPORTING]: 'None',
  [CONTRADICTION.SOME_REFUTING]: 'Some',
  [CONTRADICTION.ALL_REFUTING]: 'All',
});

export const HEDGING = Object.freeze({
  NONE: 0,
  SOME: 1,
  ALL: 2,
});

export const HEDGING_MAP = Object.freeze({
  [HEDGING.NONE]: 'No hedging',
  [HEDGING.SOME]: 'Some hedged evidence',
  [HEDGING.ALL]: 'All hedged evidence',
});

export const READERS_NAMES = ['sofia', 'eidos', 'hume'];

export default {
  CODE_TABLE,
  FIELDS,
  CONTRADICTION,
  CONTRADICTION_MAP,
  HEDGING,
  HEDGING_MAP,
  READERS_NAMES,
};
