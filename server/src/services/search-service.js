const _ = require('lodash');
const Logger = rootRequire('/config/logger');
const { client, searchAndHighlight } = rootRequire('/adapters/es/client');
const { RESOURCE } = rootRequire('/adapters/es/adapter');
const { getCache } = rootRequire('/cache/node-lru-cache');

// Remove unneeded fields from compositional ontology
const formatOntologyDoc = (d) => {
  return {
    label: d.label,
    definition: d.definition,
    examples: d.examples
  };
};

// Search against ontology concepts
const rawConceptEntitySearch = async (projectId, queryString) => {
  const filters = [{
    terms: {
      project_id: [projectId]
    }
  }];

  const results = await searchAndHighlight(RESOURCE.ONTOLOGY, queryString, filters, [
    'label',
    'examples'
  ]);

  return results.map(d => {
    return {
      doc_type: 'concept',
      doc: formatOntologyDoc(d._source),
      highlight: d.highlight
    };
  });
};


/**
 * Given a flattened-concept, return a list of compositional ontology concepts.
 * This is a greedy-recursive algorithm.
 *
 * For example given name = a_b_c_d, and conceptSet = {a_b, c_d, x_y}
 * 0. set str = [a, b, c, d]
 * 1. check [a, b, c, d], no match
 * 2. check [a, b, c], no match
 * 3. check [a, b], match, set str = [c, d]
 * 4. check [c, d] match, make str = []
 */
const reverseFlattenedConcept = (name, conceptSet) => {
  const token = _.last(name.split('/')) || '';

  if (conceptSet.has(token)) return [token];

  // Recursively tease out components - greedy
  let str = token;
  const concepts = [];
  while (str !== '') {
    const fragments = str.split('_') || '';
    let found = false;
    for (let i = fragments.length; i > 0; i--) {
      const concept = _.take(fragments, i).join('_');
      if (conceptSet.has(concept)) {
        concepts.push(concept);
        str = _.takeRight(fragments, fragments.length - i).join('_');
        found = true;
        break;
      }
    }
    if (found === false) {
      return [token];
    }
  }

  if (concepts.length > 0) {
    return concepts;
  }
  return [token];
};


/**
 * Build an ES query to search by compositional ontology concepts
 *
 * FIXME: Need to handle user-created??
 */
const buildSubjObjAggregation = (concepts) => {
  const limit = 10;
  return {
    filteredSubj: {
      filter: {
        bool: {
          should: [
            { terms: { 'subj.theme': concepts } },
            { terms: { 'subj.theme_property': concepts } },
            { terms: { 'subj.process': concepts } },
            { terms: { 'subj.process_property': concepts } }
          ]
        }
      },
      aggs: {
        fieldAgg: {
          terms: {
            field: 'subj.concept.raw',
            size: limit
          }
        }
      }
    },
    filteredObj: {
      filter: {
        bool: {
          should: [
            { terms: { 'obj.theme': concepts } },
            { terms: { 'obj.theme_property': concepts } },
            { terms: { 'obj.process': concepts } },
            { terms: { 'obj.process_property': concepts } }
          ]
        }
      },
      aggs: {
        fieldAgg: {
          terms: {
            field: 'obj.concept.raw',
            size: limit
          }
        }
      }
    }
  };
};


// Search for concepts within a given project's INDRA statements
const statementConceptEntitySearch = async (projectId, queryString) => {
  Logger.info(`Query ${projectId} ${queryString}`);
  // Bootstrap from rawConcept
  const rawResult = await rawConceptEntitySearch(projectId, queryString + '*');
  if (_.isEmpty(rawResult)) return [];

  const matchedRawConcepts = rawResult.map(d => d.doc.label);
  const aggFilter = buildSubjObjAggregation(matchedRawConcepts);

  const result = await client.search({
    index: projectId,
    body: {
      size: 0,
      aggs: aggFilter
    }
  });

  const aggResult = result.body.aggregations;
  const items = [
    ...aggResult.filteredSubj.fieldAgg.buckets,
    ...aggResult.filteredObj.fieldAgg.buckets
  ];

  // Start post processing, unique and attach matched metadata
  const dupeMap = new Map();
  const finalResults = [];

  const ontologyMap = getCache(projectId).ontologyMap;
  const ontologyKeys = Object.keys(ontologyMap);
  const ontologyValues = Object.values(ontologyMap);
  const set = new Set(ontologyKeys.map(d => _.last(d.split('/'))));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (dupeMap.has(item.key)) continue;

    const memberStrings = reverseFlattenedConcept(item.key, set);
    const members = ontologyValues.filter(d => {
      return memberStrings.includes(_.last(d.label.split('/'))) && !_.isEmpty(d.examples);
    }).map(formatOntologyDoc);

    // Attach highlight if applicable
    for (let j = 0; j < members.length; j++) {
      const highlightMatch = rawResult.find(d => d.doc.label === members[j].label);
      if (_.isNil(highlightMatch)) continue;
      members[j].highlight = highlightMatch.highlight;
    }

    const r = {
      doc_type: 'concept',
      doc: {
        key: item.key,
        members: members
      }
    };
    finalResults.push(r);
    dupeMap.set(item.key, 1);
  }

  // FIXME: Also attach concept matches
  return finalResults;
};


const indicatorConceptFilter = (concepts) => {
  let minimumMatchNumber = 0;

  const len = concepts.length;
  if (len <= 2) {
    minimumMatchNumber = len;
  } else {
    // At least half + 1
    minimumMatchNumber = Math.floor(len / 2) + 1;
  }

  const termQueries = concepts.map(concept => {
    return {
      nested: {
        path: 'ontology_matches',
        query: {
          term: {
            'ontology_matches.name.raw': concept
          }
        }
      }
    };
  });

  return {
    bool: {
      should: termQueries,
      minimum_should_match: minimumMatchNumber
    }
  };
};
const indicatorSearchByConcepts = async (projectId, flatConcepts) => {
  const ontologyMap = getCache(projectId).ontologyMap;
  const ontologyValues = Object.values(ontologyMap);
  const ontologyKeys = Object.keys(ontologyMap);
  const set = new Set(ontologyKeys.map(d => _.last(d.split('/'))));

  let allMembers = [];
  for (let i = 0; i < flatConcepts.length; i++) {
    const flattenedConcept = flatConcepts[i];
    const memberStrings = reverseFlattenedConcept(flattenedConcept, set);

    const members = ontologyValues.filter(d => {
      return memberStrings.includes(_.last(d.label.split('/')));
    }).map(d => d.label);

    if (members.length) {
      allMembers = allMembers.concat(members);
    } else {
      allMembers.push(flattenedConcept);
    }
  }

  const searchPayload = {
    index: RESOURCE.DATA_DATACUBE,
    size: 10,
    body: {
      query: {
        bool: {
          must: [
            indicatorConceptFilter(allMembers),
            { match: { type: 'indicator' } }
          ]
        }
      }
    }
  };

  const results = await client.search(searchPayload);
  return results.body.hits.hits.map(d => d._source);
};



module.exports = {
  statementConceptEntitySearch,
  indicatorSearchByConcepts
};
