const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');


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
const getDatacubes = async(filter) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  return await connection.find(filter, { size: SEARCH_LIMIT });
};

/**
 * Return the total number of datacubes (models + indicators) that match the provided filter
 */
const countDatacubes = async (filter) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  return await connection.count(filter);
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

  facets,
  searchFields
};

