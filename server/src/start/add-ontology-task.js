const Logger = rootRequire('/config/logger');
const requestAsPromise = rootRequire('/util/request-as-promise');
const projectService = rootRequire('/services/project-service');

const addUAzOntology = async () => {
  Logger.info('Calling UAz\'s addOntology');
  const projects = await projectService.listProjects();
  const addedOntologies = {};

  for (const project of projects) {
    if (!project.ontology.startsWith('http') && !(project.ontology in addedOntologies)) {
      Logger.info('Calling addOntology for ontology ' + project.ontology);
      const options = {
        method: 'PUT',
        url: `http://linking.cs.arizona.edu/v2/addOntology?secret=${process.env.CONCEPT_ALIGNER_SECRET}&ontologyId=${project.ontology}`,
        headers: {
          'Content-type': 'application/json'
        },
        json: {}
      };
      try {
        await requestAsPromise(options);
        addedOntologies[project.ontology] = true;
      } catch (e) {
        Logger.error(e);
      }
    }
  }
};

const startAddUAzOntology = (interval) => {
  setInterval(addUAzOntology, interval);
};

module.exports = { startAddUAzOntology, addUAzOntology };
