const _ = require('lodash');
const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');
const domainProjectService = rootRequire('/services/domain-project-service');
const { processFilteredData, removeUnwantedData } = rootRequire('util/post-processing-util.ts');
const Logger = rootRequire('/config/logger');

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
  if (!options.excludes) {
    options.excludes = [
      'outputs.ontologies',
      'qualifier_outputs.ontologies',
      'ontology_matches'
    ];
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
  Logger.info(`Start insert datacube ${metadata.name} ${metadata.id}`);
  // TODO: Fix all this copypasta from maas-service startIndicatorPostProcessing

  metadata.type = metadata.type || 'model'; // Assume these ar all models for now
  metadata.is_stochastic = metadata.is_stochastic || metadata.stochastic;
  processFilteredData(metadata);
  removeUnwantedData(metadata);

  metadata.data_id = metadata.id;
  metadata.status = 'REGISTERED';

  // Take the first numeric output, others are not currently supported
  const validOutput = metadata.outputs.filter(o =>
    o.type === 'int' || o.type === 'float' || o.type === 'boolean'
  )[0] || metadata.outputs[0];
  metadata.default_feature = validOutput.name;

  // Combine all concept matches into one list at the root
  const fields = [metadata.outputs, metadata.parameters];
  if (metadata.qualifier_outputs) {
    fields.push(metadata.qualifier_outputs);
  }

  const ontologyMatches = fields.map(field => {
    return field.filter(variable => variable.ontologies)
      .map(variable => [
        ...variable.ontologies.concepts,
        ...variable.ontologies.processes,
        ...variable.ontologies.properties
      ]);
  }).flat(2);

  metadata.ontology_matches = _.sortedUniqBy(_.orderBy(ontologyMatches, ['name', 'score'], ['desc', 'desc']), 'name');

  // a new datacube (model or indicator) is being added
  // ensure for each newly registered datacube a corresponding domain project
  await domainProjectService.updateDomainProjects(metadata);

  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  try {
    const result = await connection.insert([metadata]);
    return { result: { es_response: result }, code: 201 };
  } catch (err) {
    return { error: err, code: 500 };
  }
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

