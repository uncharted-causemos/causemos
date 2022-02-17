const Logger = rootRequire('/config/logger');
const requestAsPromise = rootRequire('/util/request-as-promise');
const projectService = rootRequire('/services/project-service');
const URL = require("url").URL;

const addUAzOntology = async () => {
    Logger.info('Calling UAz\'s addOntology');
    const projects = await projectService.listProjects();

    for (const project of projects) {
        try {
            // want to skip ontologies that are URLs
            // could just check if ending is .yml
            new URL(project.ontology);
        } catch (e) {
            Logger.info('Calling addOntology for ontology ' + project.ontology);
            const options = {
                method: 'PUT',
                url: `http://linking.cs.arizona.edu/v2/addOntology?secret=${process.env.UAZ_SECRET}&ontologyId=${project.ontology}`,
                headers: {
                    'Content-type': 'application/json'
                },
                json: {}
            };
            try {
                await requestAsPromise(options);
            } catch (e) {
                Logger.error(e);
            }
        }
    }
};

const startAddUAzOntology = (interval) => {
    setInterval(addUAzOntology, interval);
};

module.exports = { startAddUAzOntology };