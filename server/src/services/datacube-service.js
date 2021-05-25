const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');


/**
 * Return all datacubes
 */
const getAllDatacubes = async() => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  return await connection.find([], { size: SEARCH_LIMIT });
};

/**
 * Return a datacube with a specific id
 *
 * @param {string} datacubeId - datacube id
 */
const getDatacube = async(datacubeId) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  return await connection.findOne([{ field: 'id', value: datacubeId }], {});
};

/**
 * Return the total number of datacubes (models + indicators)
 */
const countDatacubes = async () => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  return await connection.count();
};


module.exports = {
  getDatacube,
  getAllDatacubes,
  countDatacubes
};

