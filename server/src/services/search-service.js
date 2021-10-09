// /* eslint-disable */
const _ = require('lodash');
const { client, searchAndHighlight } = rootRequire('/adapters/es/client');
const { RESOURCE } = rootRequire('/adapters/es/adapter');


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

  const mapSource = (d) => {
    return {
      label: d.label,
      definition: d.definition,
      examples: d.examples
    };
  };

  return results.map(d => {
    return {
      doc_type: 'concept',
      doc: mapSource(d._source),
      highlight: d.highlight
    };
  });
};



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
  // Bootstrap from rawConcept
  const rawResult = await rawConceptEntitySearch(projectId, queryString);
  if (_.isEmpty(rawResult)) return [];

  // FIXME: wm_compositional => wm
  const matchedRawConcepts = rawResult.map(d => d.doc.label).map(d => d.replace('wm', 'wm_compositional'));
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

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (dupeMap.has(item.key)) continue;

    const shortKey = _.last(item.key.split('/'));
    const matchedMembers = rawResult.filter(r => {
      const matchShortKey = _.last(r.doc.label.split('/'));
      return shortKey.includes(matchShortKey);
    });

    const r = {
      doc_type: 'xyz',
      doc: {
        concept: item.key,
        highlight: matchedMembers
      }
    };
    finalResults.push(r);
    dupeMap.set(item.key, 1);
  }
  return finalResults;
};


/**
 * Searches for first class documents
 */
const entitySearch = async (projectId, queryString) => {
  // const rawConcepts = await rawConceptEntitySearch(projectId, queryString);
  // return rawConcepts;

  const rawConcepts = await statementConceptEntitySearch(projectId, queryString);
  return rawConcepts;
};


module.exports = {
  entitySearch,
  statementConceptEntitySearch
};
