const _ = require('lodash');
const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');
const domainProjectService = rootRequire('/services/domain-project-service');
const { filterWithSchema } = rootRequire('util/joi-util.ts');

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

  metadata.type = metadata.type || 'model'; // Assume these ar all models for now
  metadata.is_stochastic = metadata.is_stochastic || metadata.stochastic;
  const filteredMetadata = filterWithSchema('./src/schemas/model.schema.json', metadata);

  // Apparently ES can't support negative timestamps
  if (filteredMetadata.period && filteredMetadata.period.gte < 0) {
    filteredMetadata.period.gte = 0;
  }
  if (filteredMetadata.period && filteredMetadata.period.lte < 0) {
    filteredMetadata.period.lte = 0;
  }

  filteredMetadata.data_id = filteredMetadata.id;
  filteredMetadata.status = 'REGISTERED';
  filteredMetadata.family_name = filteredMetadata.family_name || filteredMetadata.name;

  // Take the first numeric output, others are not currently supported
  const validOutput = filteredMetadata.outputs.filter(o =>
    o.type === 'int' || o.type === 'float' || o.type === 'boolean'
  )[0] || filteredMetadata.outputs[0];
  filteredMetadata.default_feature = validOutput.name;

  // Combine all concept matches into one list at the root
  const fields = [filteredMetadata.outputs, filteredMetadata.parameters];
  if (filteredMetadata.qualifier_outputs) {
    fields.push(filteredMetadata.qualifier_outputs);
  }

  const ontologyMatches = fields.map(field => {
    return field.filter(variable => variable.ontologies)
      .map(variable => [
        ...variable.ontologies.concepts,
        ...variable.ontologies.processes,
        ...variable.ontologies.properties
      ]);
  }).flat(2);

  filteredMetadata.ontology_matches = _.sortedUniqBy(_.orderBy(ontologyMatches, ['name', 'score'], ['desc', 'desc']), 'name');

  // a new datacube (model or indicator) is being added
  // ensure for each newly registered datacube a corresponding domain project
  await domainProjectService.updateDomainProjects(filteredMetadata);

  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  return await connection.insert([filteredMetadata]);
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

