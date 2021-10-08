const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');

/**
 * Search various fields in ES for terms starting with the queryString
 */
const searchFields = async (searchField, queryString) => {
  const connection = Adapter.get(RESOURCE.GADM_NAME);
  const matchedTerms = await connection.searchFields(searchField, queryString);
  return matchedTerms;
};

module.exports = {
  searchFields
};
