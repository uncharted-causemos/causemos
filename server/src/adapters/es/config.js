const FIELD_TYPES = Object.freeze({
  NORMAL: 0,
  REGEXP: 1,
  RANGED: 2,
  DATE: 3,
  CUSTOM: 7,
  _QUALITY: 99 // HACK for query-util
});

const FIELD_LEVELS = Object.freeze({
  STATEMENT: 0,
  EVIDENCE: 1 // nested evidence & document_meta
});

const NESTED_FIELD_PATHS = Object.freeze({
  EVIDENCE: 'evidence'
});

// helper function
const docPath = (v) => `evidence.document_context.${v}`;

const FIELDS = Object.freeze({
  id: {
    fields: ['id'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  enable: { // placeholder for global filters
    type: FIELD_TYPES.CUSTOM
  },
  state: {
    fields: ['wm.state'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  keyword: { // For search only
    fields: ['subj.concept', 'obj.concept', 'subj.factor', 'obj.factor'],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.STATEMENT
  },
  subjConcept: {
    fields: ['subj.concept'],
    aggFields: ['subj.concept.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  subjPolarity: {
    fields: ['subj.polarity'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  subjConceptScore: {
    fields: ['subj.concept_score'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  objConcept: {
    fields: ['obj.concept'],
    aggFields: ['obj.concept.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  objPolarity: {
    fields: ['obj.polarity'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  objConceptScore: {
    fields: ['obj.concept_score'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  factorPolarity: { // For search only
    fields: ['subj.polarity', 'obj.polarity'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  factorLocationName: {
    fields: ['subj.geo_context.name', 'obj.geo_context.name'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  factorMonth: {
    fields: [
      'subj.time_context.start.month', 'obj.time_context.start.month', // start
      'subj.time_context.end.month', 'obj.time_context.end.month' // end
    ],
    type: FIELD_TYPES.RANGED,
    level: FIELD_LEVELS.STATEMENT
  },
  factorYear: {
    fields: [
      'subj.time_context.start.year', 'obj.time_context.start.year', // start
      'subj.time_context.end.year', 'obj.time_context.end.year' // end
    ],
    type: FIELD_TYPES.RANGED,
    level: FIELD_LEVELS.STATEMENT
  },
  statementPolarity: {
    fields: ['wm.statement_polarity'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  topic: {
    fields: ['wm.topic'], // equivalent of ['subj.concept', 'obj.concept']
    aggFields: ['wm.topic.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  edge: {
    fields: ['wm.edge'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  contradictionCategory: {
    fields: ['wm.contradiction_category'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  hedgingCategory: {
    fields: ['wm.hedging_category'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },
  belief: {
    fields: ['belief'],
    type: FIELD_TYPES.RANGED,
    level: FIELD_LEVELS.STATEMENT,
    range: [
      { from: 0.0, to: 0.1 },
      { from: 0.1, to: 0.2 },
      { from: 0.2, to: 0.3 },
      { from: 0.3, to: 0.4 },
      { from: 0.4, to: 0.5 },
      { from: 0.5, to: 0.6 },
      { from: 0.6, to: 0.7 },
      { from: 0.7, to: 0.8 },
      { from: 0.8, to: 0.9 },
      { from: 0.9, to: '--' }
    ]
  },
  numEvidence: {
    fields: ['wm.num_evidence'],
    type: FIELD_TYPES.RANGED,
    level: FIELD_LEVELS.STATEMENT,
    range: [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 5 },
      { from: 5, to: '--' }
    ]
  },
  minGroundingScore: {
    fields: ['wm.min_grounding_score'],
    type: FIELD_TYPES.RANGED,
    level: FIELD_LEVELS.STATEMENT,
    range: [
      { from: 0.0, to: 0.1 },
      { from: 0.1, to: 0.2 },
      { from: 0.2, to: 0.3 },
      { from: 0.3, to: 0.4 },
      { from: 0.4, to: 0.5 },
      { from: 0.5, to: 0.6 },
      { from: 0.6, to: 0.7 },
      { from: 0.7, to: 0.8 },
      { from: 0.8, to: 0.9 },
      { from: 0.9, to: '--' }
    ]
  },
  // FIXME: need to figure out how to facet date range properly
  startDate: {
    fields: ['subj.time_context.start.date', 'obj.time_context.start.date'],
    type: FIELD_TYPES.DATE,
    level: FIELD_LEVELS.STATEMENT,
    range: [
      { from: 1990, to: 1995 },
      { from: 1995, to: 2000 },
      { from: 2000, to: 2005 },
      { from: 2005, to: 2010 },
      { from: 2010, to: '--' }
    ]
  },
  reader: {
    fields: ['wm.readers'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.STATEMENT
  },

  // Placeholder for custom filter
  quality: {
    type: FIELD_TYPES._QUALITY,
    level: FIELD_LEVELS.CUSTOM
  },

  // Document context
  docId: {
    fields: [docPath('doc_id')],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.EVIDENCE
  },
  docPublicationYear: {
    fields: [docPath('publication_date.year')],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.EVIDENCE
  },
  docPublisherName: {
    fields: [docPath('publisher_name')],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.EVIDENCE
  },
  docFileType: {
    fields: [docPath('file_type')],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.EVIDENCE
  },
  docAuthor: {
    fields: [docPath('author')],
    aggFields: [docPath('author.raw')],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.EVIDENCE
  },
  docOrganization: {
    fields: [docPath('ner_analytics.org')],
    aggFields: [docPath('ner_analytics.org.raw')],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.EVIDENCE
  },
  docLocation: {
    fields: [docPath('ner_analytics.loc')],
    aggFields: [docPath('ner_analytics.loc.raw')],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.EVIDENCE
  },
  docSubjectivity: {
    fields: [docPath('analysis.subjectivity')],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.EVIDENCE
  },
  docSentiment: {
    fields: [docPath('analysis.sentiment')],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.EVIDENCE
  },
  docStance: {
    fields: [docPath('analysis.stance')],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.EVIDENCE
  },
  // Types of document sources => AutoCollection: Factiva, BackgroundSource: LUMA - Tom C. Sept 18th 2020
  docSourceDomain: {
    fields: [docPath('document_source')],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.EVIDENCE
  },
  docLabel: {
    fields: [docPath('label')],
    aggFields: [docPath('label.raw')],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.EVIDENCE
  },
  docByodTag: {
    fields: [docPath('origin.byod_tag')],
    aggFields: [docPath('origin.byod_tag.raw')],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.EVIDENCE
  },
  docGenre: {
    fields: [docPath('genre')],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.EVIDENCE
  }
});

module.exports = {
  FIELDS,
  FIELD_TYPES,
  FIELD_LEVELS,
  NESTED_FIELD_PATHS
};
