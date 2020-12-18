/* eslint camelcase: 0 */

const _ = require('lodash');
const moment = require('moment');

const UNKNOWN_STR = 'Unknown';
const UNKNOWN = 0;
const STAGING_STATE = 0;
const NOT_EDITED = 0;

const formatConceptName = (concept) => {
  const formatted = _.replace(concept, '\\', '_and_');
  return formatted;
};
const isInfluenceType = (value) => (value.type.toLowerCase() === 'influence');

const _convertToIndraResource = (statement, resourceType) => {
  const newComponent = {};
  const statementResource = statement[resourceType];
  const resourcePolarity = statementResource.polarity;
  newComponent[`${resourceType}_delta`] = {
    polarity: resourcePolarity,
    adjectives: statementResource.adjectives
  };
  newComponent[resourceType] = {
    name: statementResource.factor,
    db_refs: {
      TEXT: statementResource.factor,
      concept: statementResource.concept
    }
  };
  return newComponent;
};

/**
 * Transform causemos evidence structure to raw indra evidence structure with available fields
 *
 * @param {array} evidence
 */
const _convertToIndraEvidence = (evidences) => {
  if (_.isEmpty(evidences)) return [];
  return evidences.map(evidence => {
    const {
      source_api,
      text,
      agents_text,
      source_hash
    } = evidence.evidence_context;
    const { doc_id } = evidence.document_context;

    return {
      source_hash,
      text,
      source_api,
      annotations: {
        agents: {
          raw_text: agents_text
        },
        provenance: [
          {
            document: { '@id': doc_id }
          }
        ],
        negated_texts: evidence.evidence_context.contradiction_words
      },
      epistemics: {
        hedgings: evidence.evidence_context.hedging_words
      }
    };
  });
};

/**
 * Convert CauseMos statements to Indra-compatible statements
 * - Removes precomputed fields
 * - Rearrange into Indra data structure
 *
 * @param {array} statements - an array of CauseMos's statements
 */
const convertToIndra = (statements) => {
  const result = [];
  if (_.isNil(statements)) {
    return result;
  }

  for (const statement of statements) {
    // Don't add ungrounded statement and statements that is not of valid type
    if (statement.subj.concept === UNKNOWN_STR || statement.obj.concept === UNKNOWN_STR) {
      continue;
    }
    const evidences = _convertToIndraEvidence(statement.evidence);
    // common fields
    const commonData = {
      // HACK: hard-coded for now but may need to support other statement types
      type: 'Influence',
      belief: statement.belief,
      evidence: evidences,
      id: statement.id
    };

    // resource ('subj' or 'obj') specific fields
    const subjData = _convertToIndraResource(statement, 'subj');
    const objData = _convertToIndraResource(statement, 'obj');

    const newIndra = Object.assign({}, commonData, subjData, objData);
    result.push(newIndra);
  }
  return result;
};

const processResourceStatementData = (indra, resourceType) => {
  // For easy reference
  const resource = indra[resourceType];
  const resourceConcept = resource.concept;
  const resourceDelta = resource.delta;
  const resourceRefs = resourceConcept.db_refs;
  const component = {};
  component[resourceType] = resourceConcept.name;
  component[`${resourceType}_adjectives`] = _.get(resourceDelta, 'adjectives', []);
  component[`${resourceType}_polarity`] = resourceDelta.polarity || UNKNOWN;
  component[`${resourceType}_refs`] = resourceRefs;
  component[`${resourceType}_concept_name`] = UNKNOWN_STR;
  component[`${resourceType}_concept_score`] = UNKNOWN;
  component[`${resourceType}_concept_candidates`] = [];
  component[`${resourceType}_text`] = resourceRefs.TEXT;
  if (!_.isNil(resourceRefs.WM)) {
    const candidates = resourceRefs.WM.map(d => {
      return {
        name: formatConceptName(d[0]),
        score: d[1]
      };
    });

    const topCandidate = candidates[0];
    component[`${resourceType}_concept_name`] = topCandidate.name;
    component[`${resourceType}_concept_score`] = topCandidate.score;
    component[`${resourceType}_concept_candidates`] = candidates;
  }

  const context = {
    time_context: {},
    geo_context: {}
  };
  if (!_.isEmpty(resource.context)) {
    const time = resource.context.time;
    if (!_.isEmpty(time)) {
      const start = moment.utc(time.start);
      const end = moment.utc(time.end);

      context.time_context = {
        start: start.valueOf(),
        start_year: +start.format('YYYY'),
        start_month: +start.format('M'),
        end: end.valueOf(),
        end_year: +end.format('YYYY'),
        end_month: +end.format('M')
      };
    }
    // FIXME: Need to be able to instantiate geo-context via GEO_ID
  }
  component[`${resourceType}_context`] = context;

  return component;
};

const processEvidence = (statements) => {
  const evidenceContextList = [];
  statements.forEach(indra => {
    indra.evidence.forEach((evidence) => {
      const evidenceContextObj = {
        text: evidence.text,
        raw_text: [],
        negation_words: [],
        hedging_words: [],
        indra_raw: evidence,
        indra_id: indra.id
      };
      const annotations = evidence.annotations;
      const agents = annotations.agents;
      if (!_.isEmpty(agents) && !_.isEmpty(agents.raw_text)) {
        evidenceContextObj.raw_text = agents.raw_text;
      } else {
        /*
         HACK: need to talk with Ben about missing raw text in evidence,
         resorting to use of subj_text and obj_text to highlight subject and object
        */
        const highlights = [];
        const subjDbRefs = indra.subj.db_refs;
        const objDbRefs = indra.obj.db_refs;
        if (!_.isEmpty(subjDbRefs) && !_.isNil(subjDbRefs.TEXT)) {
          highlights.push(subjDbRefs.TEXT);
        }
        if (!_.isEmpty(objDbRefs) && !_.isNil(objDbRefs.TEXT)) {
          highlights.push(objDbRefs.TEXT);
        }

        evidenceContextObj.raw_text = highlights;
      }

      // added in negated and hedging highlights to keep it consistent with indra loader script
      if (!_.isEmpty(annotations.negated_text)) {
        evidenceContextObj.negation_words = annotations.negated_texts;
      }
      if (!_.isEmpty(evidence.epistemics) && !_.isEmpty(evidence.epistemics.hedgings)) {
        evidenceContextObj.hedging_words = evidence.epistemics.hedgings;
      }
      evidenceContextList.push(evidenceContextObj);
    });
  });
  return evidenceContextList;
};

const processDocumentMeta = (evidences) => {
  const documentContextList = [];
  evidences.forEach((evidence) => {
    const annotations = evidence.annotations;
    const documentContextObj = {
      rating: 0
    };
    if (!_.isEmpty(annotations.provenance)) {
      // Pick first provenance
      const provenance = annotations.provenance[0];

      documentContextObj.doc_id = provenance.document['@id'];
      documentContextObj.corpus = 'User Input';
    }
    documentContextList.push(documentContextObj);
  });
  return documentContextList;
};

const getCategory = (total, num) => {
  /*
   * Assign category buckets (from https://gitlab.uncharted.software/WM/wm-indra-loader/blob/master/bin/import_mitre_indra.py):
   * 0: none
   * 1: some
   * 2: all
   */
  let category = 0;
  if (num > 0) {
    if (total > num) {
      category = 1;
    } else if (total === num) {
      category = 2;
    }
  }
  return category;
};

const convertFromIndras = (indras) => {
  // TODO: Ignore for now but should either log or bubble up the conversion error
  return indras.map(indra => convertFromIndra(indra)).filter(indra => !_.isEmpty(indra));
};

const convertFromIndra = (indra) => {
  let newStatement = {};

  if (!_.isNil(indra.id) && isInfluenceType(indra)) {
    // Resource ('subj' or 'obj') type specific fields
    const subjData = processResourceStatementData(indra, 'subj');
    const objData = processResourceStatementData(indra, 'obj');

    // Conditional computed properties
    let statementPolarity = UNKNOWN;
    if (subjData.subj_polarity !== UNKNOWN && objData.obj_polarity !== UNKNOWN) {
      statementPolarity = subjData.subj_polarity * objData.obj_polarity;
    }
    const evidences = _.isEmpty(indra.evidence) ? [] : indra.evidence;
    let readers = evidences.map(v => v.source_api);
    const processedDocumentMeta = processDocumentMeta(evidences);
    let numContradictions = 0;
    let numHedgings = 0;

    evidences.forEach((evidence) => {
      const epistemics = evidence.epistemics;
      if (!_.isNil(epistemics)) {
        if (!_.isNil(epistemics.negated) && epistemics.negated) {
          numContradictions += 1;
        }
        if (!_.isNil(epistemics.hedgings) && epistemics.hedgings) {
          numHedgings += 1;
        }
      }
    });
    const numEvidences = evidences.length;

    const contradictionCategory = getCategory(numEvidences, numContradictions);
    const hedgingCategory = getCategory(numEvidences, numHedgings);

    // Make the values unique;
    readers = _.uniq(readers);

    // Common fields
    const commonData = {
      type: indra.type,
      id: indra.id,
      num_evidences: numEvidences,
      belief: Math.min(indra.belief, 1.0),
      readers: readers,
      statement_polarity: statementPolarity,
      num_contradictions: numContradictions,
      contradiction_category: contradictionCategory,
      hedging_category: hedgingCategory,
      is_selfloop: subjData.subj_concept_name === objData.obj_concept_name,
      edge: `${subjData.subj_concept_name}///${objData.obj_concept_name}`,
      document_context: processedDocumentMeta,
      state: STAGING_STATE, // staging state for creating new evidence feature
      edited: NOT_EDITED // new INDRA statement so edited is false
    };
    if (!_.isEmpty(indra.supports)) {
      commonData.supports = indra.supports;
    }
    if (!_.isEmpty(indra.supports)) {
      commonData.supported_by = indra.supported_by;
    }

    newStatement = Object.assign({}, commonData, subjData, objData);
  }

  return newStatement;
};

module.exports = {
  convertToIndra,
  convertFromIndra,
  convertFromIndras,
  processEvidence
};
