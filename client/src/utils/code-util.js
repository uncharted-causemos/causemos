/**
 * Marking a field as searchable makes known to LEX.
 * Note a ranged search is more restrictive as the application allows one
 * ranged term per field. This is due to synchronizing against the facets,
 * which only allows a single range.
 *
 * @param {string} searchDisplay - text display
 * @param {boolean} ranged - if the search is ranged or not
 */
const _searchable = (searchDisplay, ranged) => {
  return {
    searchable: true, ranged, searchDisplay
  };
};

/**
 * This tags the code constant with the API field.
 *
 * Note the field is not the actual DB field but is the abstraction layer field.
 *
 * @param {string} field - field name
 * @param {string} display - human readable display
 */
const _field = (field, display, icon = null, iconText = '') => {
  return { field, display, icon, iconText };
};


/**
 * Configures field attributes, determines how they are displayed and their search semantics
 *
 * Note lexType and baseType defines the value translation needed to go to/from LEX. LEX by default
 * uses string-types while fields can have heterogeneous types.
*/
export const CODE_TABLE = {
  // Subject specific
  SUBJ_ADJECTIVES: {
    ..._field('subjAdjectives', 'Cause Adjectives')
  },
  SUBJ: {
    ..._field('subjFactor', 'Cause Name')
  },
  SUBJ_CONCEPT: {
    ..._field('subjConcept', 'Cause Grounding'),
    ..._searchable('Cause', false)
  },
  SUBJ_CONCEPT_SCORE: {
    ..._field('subjConceptScore', 'Cause Grounding Score')
  },
  SUBJ_POLARITY: {
    ..._field('subjPolarity', 'Cause Polarity')
  },

  // Object specific
  OBJ_ADJECTIVES: {
    ..._field('objAdjectives', 'Effect Adjectives')
  },
  OBJ: {
    ..._field('objFactor', 'Effect Name')
  },
  OBJ_CONCEPT: {
    ..._field('objConcept', 'Effect Grounding'),
    ..._searchable('Effect', false)
  },
  OBJ_CONCEPT_SCORE: {
    ..._field('objConceptScore', 'Effect Grounding Score')
  },
  OBJ_POLARITY: {
    ..._field('objPolarity', 'Effect Polarity')
  },

  // Factor level
  POLARITY: {
    ..._field('factorPolarity', 'Polarity'),
    ..._searchable('Polarity', false),
    baseType: 'integer',
    lexType: 'string'
  },
  SCORE: {
    ..._field('minGroundingScore', 'Grounding Score'),
    ..._searchable('Grounding Score', true)
  },
  TOPIC: {
    ..._field('topic', 'Concept', 'fa-sitemap'),
    ..._searchable('Concept', false)
  },
  INTERVENTION: { // This is a subset of topic
    ..._field('intervention', 'Intervention(*)', 'fa-sitemap', '*'),
    ..._searchable('Intervention(*)', false)
  },


  // Statement level
  TYPE: {
    ..._field('type', 'Type')
  },
  SENTENCES: {
    ..._field('sentences', 'Evidence Text')
  },
  READERS: {
    ..._field('reader', 'Readers', 'fa-book'),
    ..._searchable('Readers', false)
  },
  STATEMENT_POLARITY: {
    ..._field('statementPolarity', 'Statement Polarity'),
    ..._searchable('Statement Polarity', false),
    baseType: 'integer',
    lexType: 'string'
  },
  BELIEF: {
    ..._field('belief', 'Belief Score'),
    ..._searchable('Belief Score', true)
  },
  NUM_EVIDENCES: {
    ..._field('numEvidence', 'Pieces of Evidence', 'fa-file-text'),
    ..._searchable('Pieces of Evidence', true)
  },
  GEO_LOCATION_NAME: {
    ..._field('factorLocationName', 'Geospatial Context', 'fa-globe'),
    ..._searchable('Geospatial Context', false)
  },
  YEAR: {
    ..._field('factorYear', 'Temporal - Year'),
    ..._searchable('Temporal - Year', true)
  },
  MONTH: {
    ..._field('factorMonth', 'Temporal - Month'),
    ..._searchable('Temporal - Month', true)
  },
  KEYWORD: {
    ..._field('keyword', 'Keyword'),
    ..._searchable('Keyword', false)
  },
  CONTRADICTION_CATEGORY: {
    ..._field('contradictionCategory', 'Refuting Evidence'),
    ..._searchable('Refuting Evidence', false),
    baseType: 'integer',
    lexType: 'string'
  },
  QUALITY: {
    ..._field('quality', 'Quality Checking'),
    ..._searchable('Quality Checking', false)
  },

  // EVIDENCE_SOURCE: {
  //   ..._field('evidenceSource', 'Evidence Source'),
  //   ..._searchable('Evidence Source', false)
  // },
  HEDGING_CATEGORY: {
    ..._field('hedgingCategory', 'Hedging'),
    ..._searchable('Hedging', false),
    baseType: 'integer',
    lexType: 'string'
  },
  EDGE: {
    ..._field('edge', 'Relations'),
    ..._searchable('Relations', false)
  },

  // Document level
  DOC_FILE_TYPE: {
    ..._field('docFileType', 'File type'),
    ..._searchable('File type', false)
  },
  DOC_PUBLICATION_YEAR: {
    ..._field('docPublicationYear', 'Publication Year'),
    ..._searchable('Publication Year', false),
    baseType: 'integer',
    lexType: 'string'
  },
  META_CORPUS: {
    ..._field('meta_corpus', 'Corpus'),
    ..._searchable('Corpus', false)
  },
  DOC_SOURCE_DOMAIN: {
    ..._field('docSourceDomain', 'Document Source'),
    ..._searchable('Document Source', false)
  },
  DOC_AUTHOR: {
    ..._field('docAuthor', 'Author'),
    ..._searchable('Author', false)
  },
  DOC_LOCATION: {
    ..._field('docLocation', 'Location'),
    ..._searchable('Location', false)
  },
  DOC_ORGANIZATION: {
    ..._field('docOrganization', 'Organization'),
    ..._searchable('Organization', false)
  },
  DOC_STANCE: {
    ..._field('docStance', 'Stance'),
    ..._searchable('Stance', false)
  },
  DOC_SENTIMENT: {
    ..._field('docSentiment', 'Sentiment'),
    ..._searchable('Sentiment', false)
  },


  // Datacube metadata fields
  DC_CONCEPT_NAME: {
    ..._field('concepts.name', 'Concept'),
    ..._searchable('Concept', false)
  },
  DC_PERIOD: {
    ..._field('period', 'Period'),
    ..._searchable('Period', true)
  },
  DC_SEARCH: {
    // _search is hidden special datacube field that combines text/keyword field values. It's used for text searching.
    ..._field('_search', 'Keyword'),
    ..._searchable('Keyword', false)
  }
};

// Map of constant to underlying data field
export const FIELDS = Object.keys(CODE_TABLE).reduce((acc, key) => {
  acc[key] = CODE_TABLE[key].field;
  return acc;
}, {});


export default {
  CODE_TABLE,
  FIELDS
};
