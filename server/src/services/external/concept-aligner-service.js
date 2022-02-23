const Logger = rootRequire('/config/logger');
const requestAsPromise = rootRequire('/util/request-as-promise');

const URL = 'http://linking.cs.arizona.edu';
const SECRET = process.env.CONCEPT_ALIGNER_SECRET;
const TIMEOUT = 3 * 1000;

// v2/addOntology?secret=${process.env.CONCEPT_ALIGNER_SECRET}&ontologyId=${project.ontology}`,

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

module.exports = {
  queryOntology,
  addOntology,
  reindex
};
