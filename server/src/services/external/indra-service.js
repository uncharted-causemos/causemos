const requestAsPromise = rootRequire('/util/request-as-promise');
const Logger = rootRequire('/config/logger');

const INDRA_URL = process.env.INDRA_URL || 'http://wm.indra.bio';

const INDRA_TIMEOUT = 5000; // 5 seconds

/**
 * Let INDRA know we have a new project
 */
const sendNewProject = async (id, name, corpusId) => {
  Logger.info(`Sending  project ${id} to INDRA`);
  const options = {
    url: INDRA_URL + '/assembly/new_project',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    timeout: INDRA_TIMEOUT,
    json: {
      project_id: id,
      project_name: name,
      corpus_id: corpusId,
    },
  };
  const indraResult = await requestAsPromise(options);
  return indraResult;
};

/**
 * Send user corrections to Indra to update underlying rules/scores
 *
 * @param {object} curationLogs - list of curation logs
 */
const sendFeedback = async (curationLogs) => {
  Logger.info(`Sending  ${Object.keys(curationLogs.curations).length} feedback to INDRA`);
  Logger.debug(JSON.stringify(curationLogs, null, 2));

  const options = {
    url: INDRA_URL + '/assembly/submit_curations',
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    json: curationLogs,
    timeout: 60000 * 3, // Ben G. said it may take a few minutes to bring up INDRA project. Oct 2020
  };

  const indraResult = await requestAsPromise(options);
  return indraResult;
};

module.exports = {
  sendNewProject,
  sendFeedback,
};
