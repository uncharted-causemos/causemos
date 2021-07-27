const _ = require('lodash');
const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');
const domainProjectService = rootRequire('/services/domain-project-service');

/**
 * Return all datacubes
 */
const getAllDatacubes = async() => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  return await connection.find([], { size: SEARCH_LIMIT });
};

/**
 * Return datacubes that match the provided filter
 */
const getDatacubes = async(filter, options) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  if (!options.size) {
    options.size = SEARCH_LIMIT;
  }
  return await connection.find(filter, options);
};

/**
 * Return the total number of datacubes (models + indicators) that match the provided filter
 */
const countDatacubes = async (filter) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  return await connection.count(filter);
};

/**
 * Insert a new datacube
 */
const insertDatacube = async(metadata) => {
  // TODO: Fix all this copypasta from maas-service startIndicatorPostProcessing

  // Remove some unused Jataware fields
  metadata.attributes = undefined;

  // Apparently ES can't support negative timestamps
  if (metadata.period && metadata.period.gte < 0) {
    metadata.period.gte = 0;
  }
  if (metadata.period && metadata.period.lte < 0) {
    metadata.period.lte = 0;
  }

  metadata.data_id = metadata.id;
  metadata.type = metadata.type || 'model'; // Assume these ar all models for now
  metadata.status = 'PROCESSING';
  metadata.family_name = metadata.family_name || metadata.name;
  metadata.outputs.forEach(output => { output.id = undefined; });
  metadata.parameters.forEach(param => { param.id = undefined; });

  // Combine all concept matches into one list at the root
  const fields = [metadata.outputs, metadata.parameters];
  if (metadata.qualifier_outputs) {
    fields.push(metadata.qualifier_outputs);
  }

  const ontologyMatches = fields.map(field => field.map(variable => [
    ...variable.ontologies.concepts,
    ...variable.ontologies.processes,
    ...variable.ontologies.properties
  ])).flat(2);

  metadata.ontology_matches = _.sortedUniqBy(_.orderBy(ontologyMatches, ['name', 'score'], ['desc', 'desc']), 'name');

  // a new datacube (model or indicator) is being added
  // ensure for each newly registered datacube a corresponding domain project
  await domainProjectService.updateDomainProjects(metadata);

  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  return await connection.insert(metadata);
};

/**
 * Update a datacube with the specified changes
 */
const updateDatacube = async(metadataDelta) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  return await connection.update([metadataDelta]);
};

/**
 * Returns field aggregations
 *
 * @param {object} filters
 * @param {array} fields
 */
const facets = async (filters, fields) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  const facets = await connection.getFacets(filters, fields);

  return facets;
};

/**
 * Search various fields in ES for terms starting with the queryString
 */
const searchFields = async (searchField, queryString) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  const matchedTerms = await connection.searchFields(searchField, queryString);
  return matchedTerms;
};


module.exports = {
  getDatacubes,
  getAllDatacubes,
  countDatacubes,

  insertDatacube,
  updateDatacube,

  facets,
  searchFields
};

