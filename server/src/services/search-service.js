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

  return results.map(d => {
    return {
      doc_type: 'concept',
      doc: d._source,
      highlight: d.highlight
    };
  });
};



const buildSubjObjAggregation = (concepts) => {
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
            size: 10
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
            size: 10
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
  console.log('first match', matchedRawConcepts);

  const aggFilter = buildSubjObjAggregation(matchedRawConcepts);

  const result = await client.search({
    index: projectId,
    body: {
      size: 0,
      aggs: aggFilter
    }
  });

  const aggResult = result.body.aggregations;
  const subjItems = aggResult.filteredSubj.fieldAgg.buckets;
  const objItems = aggResult.filteredObj.fieldAgg.buckets;

  // Start post processing, unique and attach matched metadata
  const dupeMap = new Map();

  for (let i = 0; i < subjItems.length; i++) {
    const item = subjItems[i];
    if (dupeMap.has(item.key)) continue;



    dupeMap.set(item.key, 1);
  }



  return [...subjItems, ...objItems];
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
