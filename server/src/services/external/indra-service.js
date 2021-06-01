// FIXME: This doesn't actually work per se because INDRA doesn't have the idea
// of having multiple models per corpus/kb.
const requestAsPromise = rootRequire('/util/request-as-promise');
const Logger = rootRequire('/config/logger');

const INDRA_URL = process.env.INDRA_URL || 'http://wm.indra.bio';

/**
 * Let INDRA know we have a new project
 */
const sendNewProject = async (id, name, corpusId) => {
  Logger.info(`Sending  project ${id} to INDRA`);
  const options = {
    url: INDRA_URL + '/assembly/new_project',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    json: {
      project_id: id,
      project_name: name,
      corpus_id: corpusId
    }
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
      'content-type': 'application/json'
    },
    json: {
      curations: curationLogs
    },
    timeout: 60000 * 3 // Ben G. said it may take a few minutes to bring up INDRA project. Oct 2020
  };

  const indraResult = await requestAsPromise(options);
  return indraResult;
};

// const recalculateBeliefScore = async (corpusId, projectId) => {
//   Logger.info('Fetching belief scores from Indra');
//   const payload = {
//     corpus_id: corpusId,
//     project_id: projectId
//   };
//
//   const options = {
//     url: process.env.INDRA_CURATION_URL + '/update_beliefs',
//     method: 'POST',
//     headers: {
//       'content-type': 'application/json'
//     },
//     json: payload
//   };
//   // Fetch scores and build bulk payload
//   const result = (await requestAsPromise(options));
//   return result;
// };

/**
 * Create a new concept on Indra.
 *
 * @param {string} conceptName - name of new concept
 * @param {array} examples - array of string examples
 */
// const createNewConcept = async (conceptName, examples) => {
//   const indraPayload = {
//     entry: conceptName,
//     examples: examples
//   };
//
//   const options = {
//     url: process.env.INDRA_CURATION_URL + '/add_ontology_entry',
//     method: 'POST',
//     headers: {
//       'content-type': 'application/json'
//     },
//     json: indraPayload
//   };
//
//   const indraResult = await requestAsPromise(options);
//   return indraResult;
// };

/**
 * Update ontological groundings, this assumes that some
 * new ontological concepts had been created previously
 *
 * Concerns: This reassembles the INDRA so this would mean that our previous corrections/audits
 * are invalid - Feb 2019
 *
 * FIXME: This can take about 70-80 seconds
 */
// const updateGroundings = async () => {
//   const indraPayload = {
//     corpus_id: '1'
//   };
//
//   const options = { // eslint-disable-line no-unused-vars
//     url: process.env.INDRA_CURATION_URL + '/update_groundings',
//     method: 'POST',
//     headers: {
//       'content-type': 'application/json'
//     },
//     timeout: 300 * 1000,
//     json: indraPayload
//   };
//   const indraResult = await requestAsPromise(options);
//   return indraResult;
// };

/**
 * Reset all customizations to the ontology
 */
// const resetOntology = async () => {
//   const options = { // eslint-disable-line no-unused-vars
//     url: `${process.env.INDRA_CURATION_URL}/reset_ontology`,
//     method: 'POST',
//     headers: {
//       'content-type': 'apllication/json'
//     }
//   };
//   const indraResult = await requestAsPromise(options);
//   return indraResult;
// };

/**
 * Reset all submitted curations so far
 */
// const resetCuration = async () => {
//   const options = { // eslint-disable-line no-unused-vars
//     url: `${process.env.INDRA_CURATION_URL}/reset_ontology`,
//     method: 'POST',
//     headers: {
//       'content-type': 'apllication/json'
//     }
//   };
//   const indraResult = await requestAsPromise(options);
//   return indraResult;
// };


// const createNewIndraStatements = async (text, reader) => {
//   // external reader configurables (in yargs-wrapper.js)
//   const indraServiceUrl = process.env.INDRA_ASSEMBLY_URL;
//   const eidosServiceUrl = process.env.EIDOS_URL;
//
//   const readerProcesserUrl = `${indraServiceUrl}/${reader}/process_text`;
//
//   const options = {
//     url: readerProcesserUrl,
//     method: 'POST',
//     headers: {
//       'content-type': 'application/json'
//     },
//     json: {
//       text: text
//     }
//   };
//
//   if (reader === 'eidos') {
//     options.json.webservice = eidosServiceUrl;
//   } else if (reader === 'sofia') {
//     options.json.auth = [
//       process.env.SOFIA_USERNAME,
//       process.env.SOFIA_PASSWORD
//     ];
//   }
//
//   // 2) Send POST request to INDRA API to get corresponding INDRA statement for the new piece of evidence
//   // if response is empty send error (could not create new statement with specified text)
//   const indraResult = await requestAsPromise(options);
//   const statements = indraResult.statements;
//   if (statements.length === 0) {
//     throw new Error('Could not create new statement with specified text');
//   }
//   return statements;
// };

module.exports = {
  sendNewProject,
  sendFeedback
  // recalculateBeliefScore
  // createNewConcept,
  // updateGroundings,
  // resetOntology,
  // resetCuration
};
