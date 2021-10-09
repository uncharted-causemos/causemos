const { searchAndHighlight } = rootRequire('/adapters/es/client');
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


// Search for concepts within a given project's INDRA statements
const statementConceptSearch = async (projectId, queryString) => {
};


/**
 * Searches for first class documents
 */
const entitySearch = async (projectId, queryString) => {
  const rawConcepts = await rawConceptEntitySearch(projectId, queryString);
  return rawConcepts;
};


module.exports = {
  entitySearch
};
