const Logger = rootRequire('/config/logger');
const requestAsPromise = rootRequire('/util/request-as-promise');

const URL = 'http://linking.cs.arizona.edu';
const SECRET = process.env.CONCEPT_ALIGNER_SECRET;
const TIMEOUT = 3 * 1000;

// Check ontology status
const queryOntology = async (ontologyId) => {
  Logger.info(`Calling ${URL}/v2/status`);
  const options = {
    url: `${URL}/v2/status?ontologyId=${ontologyId}`,
    method: 'GET',
    json: {},
    timeout: TIMEOUT
  };
  const result = await requestAsPromise(options);
  return result;
};

// Register ontology
const addOntology = async (ontologyId) => {
  Logger.info(`Calling ${URL}/v2/addOntology`);
  const options = {
    url: `${URL}/v2/addOntology?ontologyId=${ontologyId}&secret=${SECRET}`,
    method: 'PUT',
    json: {},
    timeout: TIMEOUT
  };
  const result = await requestAsPromise(options);
  return result;
};

// Reindex: e.g. DOJO has changed
const reindex = async () => {
  Logger.info(`Calling ${URL}/v1/reindex`);
  const options = {
    url: `${URL}/v1/reindex?secret=${SECRET}`,
    method: 'PUT',
    json: {},
    timeout: TIMEOUT
  };
  const result = await requestAsPromise(options);
  return result;
};

// Bulk search
const bulkSearch = async (ontologyId, payload, maxHits, threshold) => {
  Logger.info(`Calling ${URL}/v2/bulkCompositionalSearch?maxHits=${maxHits}&threshold=${threshold}`);
  const options = {
    url: `${URL}/v2/bulkCompositionalSearch?ontologyId=${ontologyId}&secret=${SECRET}&maxHits=${maxHits}&threshold=${threshold}`,
    method: 'PUT',
    json: payload,
    timeout: TIMEOUT
  };
  const result = await requestAsPromise(options);
  return result;
};

module.exports = {
  queryOntology,
  addOntology,
  reindex,
  bulkSearch
};
