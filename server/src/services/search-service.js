const _ = require('lodash');
const Logger = rootRequire('/config/logger');
const requestAsPromise = rootRequire('/util/request-as-promise');
const { client, searchAndHighlight, queryStringBuilder } = rootRequire('/adapters/es/client');
const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');
const { getCache } = rootRequire('/cache/node-lru-cache');

const conceptAlignerService = rootRequire('/services/external/concept-aligner-service');

// Remove unneeded fields from compositional ontology
const formatOntologyDoc = (d) => {
  return {
    label: d.label,
    definition: d.definition,
    examples: d.examples
  };
};

const formatDatacubeDoc = (d) => {
  const defaultFeature = d.outputs.find(output => output.name === d.default_feature);
  const res = defaultFeature.data_resolution ? defaultFeature.data_resolution.temporal_resolution : undefined;

  return {
    id: d.id,
    data_id: d.data_id,
    name: d.name,
    family_name: d.family_name,
    category: d.category,
    period: d.period,
    type: d.type,

    feature: defaultFeature.name,
    display_name: defaultFeature.display_name,
    description: defaultFeature.description,
    raw_temporal_resolution: res
  };
};

// Search against ontology concepts
const rawConceptEntitySearch = async (projectId, queryString) => {
  const filters = [{
    terms: {
      project_id: [projectId]
    }
  }];

  const reserved = ['or', 'and'];

  const builder = queryStringBuilder()
    .setOperator('OR')
    .setFields(['examples', 'label', 'definition']);

  queryString
    .split(' ')
    .filter(s => {
      return !reserved.includes(s.toLowerCase());
    })
    .forEach(v => builder.addWildCard(v));

  const results = await searchAndHighlight(RESOURCE.ONTOLOGY, builder.build(), filters, [
    'label',
    'examples'
  ]);

  return results.map(d => {
    return {
      doc_type: 'concept',
      score: d._score,
      doc: formatOntologyDoc(d._source),
      highlight: d.highlight
    };
  });
};


// Search against ontology concepts
const rawConceptEntitySearch2 = async (projectId, queryString) => {
  const filters = [{
    terms: {
      project_id: [projectId]
    }
  }];

  const reserved = ['or', 'and'];

  const builder = queryStringBuilder()
    .setOperator('OR')
    .setFields(['examples', 'label^20', 'definition']);

  const tokens = queryString
    .split(' ')
    .filter(s => {
      return !reserved.includes(s.toLowerCase());
    });

  let c = tokens.length * 2;
  for (let i = 0; i < tokens.length; i++) {
    builder.add(`(${tokens[i]}*)^${c}`);
    c--;
  }

  const results = await searchAndHighlight(RESOURCE.ONTOLOGY, builder.build(), filters, [
    'label',
    'examples'
  ]);

  return results.map(d => {
    return {
      doc_type: 'concept',
      score: d._score,
      doc: formatOntologyDoc(d._source),
      highlight: d.highlight
    };
  });
};


const rawDatacubeSearch = async (queryString) => {
  const filters = [];
  const reserved = ['or', 'and'];
  const builder = queryStringBuilder()
    .setOperator('OR')
    .setFields([
      'outputs.description'
    ]);

  queryString
    .split(' ')
    .filter(s => {
      return !reserved.includes(s.toLowerCase());
    })
    .forEach(v => builder.addWildCard(v));

  const results = await searchAndHighlight(RESOURCE.DATA_DATACUBE, builder.build(), filters, [
  ]);

  return results.map(d => {
    return {
      doc_type: 'data_cube',
      score: d._score,
      doc: formatDatacubeDoc(d._source),
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
 * FIXME: Maybe checkout sampler aggregations: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-sampler-aggregation.html
 */
const buildSubjObjAggregation = (concepts) => {
  const limit = 10;
  const minimumShouldMatch = concepts.length < 2 ? 1 : 2;
  return {
    filteredSubj: {
      filter: {
        bool: {
          should: [
            { terms: { 'subj.theme': concepts } },
            { terms: { 'subj.theme_property': concepts } },
            { terms: { 'subj.process': concepts } },
            { terms: { 'subj.process_property': concepts } }
          ],
          minimum_should_match: minimumShouldMatch
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
          ],
          minimum_should_match: minimumShouldMatch
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



const statementConceptEntitySearch = async (projectId, queryString) => {
  const reserved = ['or', 'and'];
  const tokens = queryString
    .split(' ')
    .filter(s => {
      return !reserved.includes(s.toLowerCase());
    });

  // 1. Search for obj and subj matches against the project directly
  const q = tokens.map(s => `(${s}~)`).join(' AND ');
  const results = await client.search({
    index: projectId,
    body: {
      size: 0,
      aggs: {
        filteredSubj: {
          filter: {
            query_string: {
              query: q,
              fields: [
                'subj.concept'
              ]
            }
          },
          aggs: {
            concept: {
              terms: {
                field: 'subj.concept.raw',
                size: 3
              },
              aggs: {
                sample: {
                  top_hits: {
                    size: 1,
                    _source: {
                      includes: [
                        'subj.theme',
                        'subj.theme_property',
                        'subj.process',
                        'subj.process_property'
                      ]
                    }
                  }
                }
              }
            }
          }
        },
        filteredObj: {
          filter: {
            query_string: {
              query: q,
              fields: [
                'obj.concept'
              ]
            }
          },
          aggs: {
            concept: {
              terms: {
                field: 'obj.concept.raw',
                size: 3
              },
              aggs: {
                sample: {
                  top_hits: {
                    size: 1,
                    _source: {
                      includes: [
                        'obj.theme',
                        'obj.theme_property',
                        'obj.process',
                        'obj.process_property'
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const subjConcepts = results.body.aggregations.filteredSubj.concept.buckets;
  const objConcepts = results.body.aggregations.filteredObj.concept.buckets;

  const map = new Map();
  const refMap = new Map();

  for (const bucket of subjConcepts) {
    const count = map.get(bucket.key) || 0;
    map.set(bucket.key, count + bucket.doc_count);

    const source = bucket.sample.hits.hits[0]._source;
    refMap.set(bucket.key, {
      theme: source.subj.theme,
      theme_property: source.subj.theme_property,
      process: source.subj.process,
      process_property: source.subj.process_property
    });
  }
  for (const bucket of objConcepts) {
    const count = map.get(bucket.key) || 0;
    map.set(bucket.key, count + bucket.doc_count);

    const source = bucket.sample.hits.hits[0]._source;
    refMap.set(bucket.key, {
      theme: source.obj.theme,
      theme_property: source.obj.theme_property,
      process: source.obj.process,
      process_property: source.obj.process_property
    });
  }

  const sortedMap = new Map([...map.entries()].sort((a, b) => {
    return b.doc_count - a.doc_count;
  }));

  // Assemble KB's result
  const ontologyMap = getCache(projectId).ontologyMap;
  const result = [];
  for (const entry of map.entries()) {
    const key = entry[0];
    const members = refMap.get(key);

    const doc = {
      key: key,
      memebers: []
    };

    ['theme',
      'theme_property',
      'process',
      'process_property'
    ].forEach(str => {
      if (members[str] && !_.isEmpty(members[str])) {
        const ontologyMemberData = ontologyMap[members[str]];
        let examples = [];
        if (ontologyMemberData) {
          examples = ontologyMemberData.examples;
        }

        doc.memebers.push({
          label: members.theme,
          examples,
          highlight: null
        });
      }
    });

    result.push({
      doc_type: 'concept',
      score: 1,
      doc
    });
  }

  // 2. Broader search for concepts using leveraging ontology and examples
  const rawConcepts = await rawConceptEntitySearch2(projectId, queryString);



  for (const rawConcept of rawConcepts) {
    // Hack: label => key
    rawConcept.doc.key = rawConcept.doc.label;
    delete rawConcept.doc.label;

    if (!_.some(result, d => d.doc.key === rawConcept.doc.key)) {
      result.push(rawConcept);
    }
  }

  return result;
};


// @deprecated
// Search for concepts within a given project's INDRA statements
const statementConceptEntitySearchOld = async (projectId, queryString) => {
  Logger.info(`Query ${projectId} ${queryString}`);

  // Bootstrap from rawConcept
  const rawResult = await rawConceptEntitySearch(projectId, queryString);
  if (_.isEmpty(rawResult)) return [];

  const scoreMap = new Map();
  rawResult.forEach(r => {
    scoreMap.set(r.doc.label, r.score);
  });

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
    // Search results in project
    ...aggResult.filteredSubj.fieldAgg.buckets,
    ...aggResult.filteredObj.fieldAgg.buckets,

    // Search result in raw ontology space
    ...matchedRawConcepts.map(d => {
      return { key: d };
    })
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

    let members = [];
    let score = 0;
    if (ontologyMap[item.key]) {
      members = ontologyValues.filter(d => d.label === item.key).map(formatOntologyDoc);
    } else {
      members = ontologyValues.filter(d => {
        return memberStrings.includes(_.last(d.label.split('/')));
      }).map(formatOntologyDoc);
    }

    // Attach highlight if applicable
    for (let j = 0; j < members.length; j++) {
      const highlightMatch = rawResult.find(d => d.doc.label === members[j].label);
      if (_.isNil(highlightMatch)) continue;
      members[j].highlight = highlightMatch.highlight;
      score += scoreMap.get(members[j].label);
    }

    const r = {
      doc_type: 'concept',
      score,
      doc: {
        key: item.key,
        members: members
      }
    };
    finalResults.push(r);
    dupeMap.set(item.key, 1);
  }


  // Temporary counter tokens
  const tokens = queryString.split(' ');
  for (let i = 0; i < finalResults.length; i++) {
    const doc = finalResults[i].doc;
    doc.tokenCounter = 0;
    for (let j = 0; j < tokens.length; j++) {
      if (doc.key.includes(tokens[j])) {
        doc.tokenCounter++;
      }
    }
  }
  finalResults.sort((a, b) => {
    return b.score * b.doc.tokenCounter - a.score * a.doc.tokenCounter;
  });
  for (let i = 0; i < finalResults.length; i++) {
    delete finalResults[i].doc.tokenCounter;
  }

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
            { match: { type: 'indicator' } },
            { match: { status: 'READY' } }
          ]
        }
      }
    }
  };

  const results = await client.search(searchPayload);
  return results.body.hits.hits.map(d => d._source);
};


/**
 * @param {string} projectId
 * @param {array} nodes - node objects
 * @param {number} k - top k-matches
 * @param {string} geography - gadm country name
 */
const indicatorSearchConceptAlignerBulk = async (projectId, nodes, k, geography) => {
  const projectConn = Adapter.get(RESOURCE.PROJECT);
  const project = await projectConn.findOne([{ field: 'id', value: projectId }], {});

  const ontologyMap = getCache(projectId).ontologyMap;
  const ontologyValues = Object.values(ontologyMap);
  const ontologyKeys = Object.keys(ontologyMap);
  const set = new Set(ontologyKeys.map(d => _.last(d.split('/'))));

  const allIndicators = [];
  const bulkSearchPayload = [];
  for (const node of nodes) {
    // match using the component that gets the highest matching score
    for (let i = 0; i < 1; i++) { // i < 1 to work with first component for now
      const component = node.components[i];
      const memberStrings = reverseFlattenedConcept(component, set);
      const members = ontologyValues.filter(d => {
        return memberStrings.includes(_.last(d.label.split('/')));
      }).map(d => d.label);

      const homeId = {};
      let foundConcept = false;
      // just use the first concept found for now
      for (const member of members) {
        if (!foundConcept && member.includes('concept')) {
          homeId.concept = member;
          foundConcept = true;
        }
        // use process if it exists in the reversed ontology
        if (member.includes('process')) {
          homeId.process = member;
        }
        if (member.includes('property')) {
          homeId.conceptProperty = member;
        }
      }
      bulkSearchPayload.push({
        homeId,
        awayId: [], // TODO: next step involves constructing an adjacency list to make awayIds
        context: '' // TODO: add text descriptions
      });
    }
  }

  const ontologyId = project.ontology;
  try {
    Logger.debug(`Concept aligner payload ${JSON.stringify(bulkSearchPayload)}`);
    const response = await conceptAlignerService.bulkSearch(ontologyId, bulkSearchPayload, k, 0.3, geography);

    for (const matches of response) {
      const indicatorsForMatches = [];
      if (matches.length > 0) {
        // need to make sure we have the indicator
        for (const match of matches) {
          if (match.datamart.datamartId === 'DOJO_Indicator') {
            const dataId = match.datamart.datasetId;
            const name = match.datamart.variableId;
            const candidates = await indicatorSeachByDatasetId(dataId, name);
            if (candidates.length > 0) {
              indicatorsForMatches.push({ score: match.score, candidate: candidates[0] });
            } else {
              Logger.warn(`Cannot find ${dataId}, ${name} in data-datacube index`);
            }
          } else if (match.datamart.datamartId === 'DOJO_Model') {
            const dataId = match.datamart.datasetId;
            const name = match.datamart.variableId;
            const candidates = await modelSearchWithName(dataId, name);
            if (candidates.length > 0) {
              indicatorsForMatches.push({ score: match.score, candidate: candidates[0] });
            } else {
              Logger.warn(`Cannot find ${dataId}, ${name} in data-datacube index`);
            }
          }
        }
      }
      allIndicators.push(indicatorsForMatches);
    }
  } catch (error) {
    console.error(error);
  }
  return allIndicators.map(indicators => indicators.sort((a, b) => b.score - a.score).slice(0, k).map(x => x.candidate));
};

// Deprecated
const indicatorSearchConceptAligner = async (projectId, node, k) => {
  const ontologyMap = getCache(projectId).ontologyMap;
  const ontologyValues = Object.values(ontologyMap);
  const ontologyKeys = Object.keys(ontologyMap);
  const set = new Set(ontologyKeys.map(d => _.last(d.split('/'))));

  const indicators = [];
  // match using the component that gets the highest matching score
  for (let i = 0; i < 1; i++) { // i < 1 to work with first component for now
    const component = node.components[i];
    const memberStrings = reverseFlattenedConcept(component, set);
    const members = ontologyValues.filter(d => {
      return memberStrings.includes(_.last(d.label.split('/')));
    }).map(d => d.label);

    const homeId = {};
    let foundConcept = false;
    // just use the first concept found for now
    for (const member of members) {
      if (!foundConcept && member.includes('concept')) {
        homeId.concept = member;
        foundConcept = true;
      }
      // use process if it exists in the reversed ontology
      if (member.includes('process')) {
        homeId.process = member;
      }
    }

    const options = {
      method: 'PUT',
      url: `http://linking.cs.arizona.edu/v1/compositionalSearch?maxHits=${k}&threshold=${0.3}`,
      headers: {
        'Content-type': 'application/json',
        'Accept': 'application/json'
      },
      json: {
        homeId,
        awayId: [] // FIXME: next step involves constructing an adjacency list to make awayIds
      }
    };
    try {
      const response = await requestAsPromise(options);
      if (response.length > 0) {
        // need to make sure we have the indicator
        for (const result of response) {
          if (result.datamart.datamartId === 'DOJO_Indicator') {
            const dataId = result.datamart.datasetId;
            const name = result.datamart.variableId;
            const candidates = await indicatorSeachByDatasetId(dataId, name);
            if (candidates.length > 0) {
              indicators.push({ score: result.score, candidate: candidates[0] });
            }
          } else if (result.datamart.datamartId === 'DOJO_Model') {
            const dataId = result.datamart.datasetId;
            const name = result.datamart.variableId;
            const candidates = await modelSearchWithName(dataId, name);
            if (candidates.length > 0) {
              indicators.push({ score: result.score, candidate: candidates[0] });
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
  return indicators.sort((a, b) => b.score - a.score).slice(0, k).map(x => x.candidate);
};

const indicatorSeachByDatasetId = async (dataId, name) => {
  const searchPayload = {
    index: RESOURCE.DATA_DATACUBE,
    size: 1,
    body: {
      query: {
        bool: {
          must: [
            {
              term: { data_id: dataId }
            },
            {
              term: { 'outputs.name': name }
            },
            {
              term: { status: 'READY' }
            }
          ]
        }
      }
    }
  };

  const results = await client.search(searchPayload);
  return results.body.hits.hits.map(d => d._source);
};

const modelSearchWithName = async (id, name) => {
  // id and dataId are interchangeable for models
  const searchPayload = {
    index: RESOURCE.DATA_DATACUBE,
    size: 1,
    body: {
      query: {
        bool: {
          must: [
            {
              term: { id: id }
            },
            {
              term: { 'outputs.name': name }
            },
            {
              term: { status: 'READY' }
            }
          ]
        }
      }
    }
  };

  const results = await client.search(searchPayload);
  // Set default_feature to name to force that output to be used
  return results.body.hits.hits.map(d => ({ ...d._source, default_feature: name }));
};



module.exports = {
  statementConceptEntitySearch,
  statementConceptEntitySearchOld,
  rawConceptEntitySearch,
  rawDatacubeSearch,
  indicatorSearchByConcepts,
  indicatorSearchConceptAligner,
  indicatorSearchConceptAlignerBulk
};
