const { setCache } = require('#@/cache/node-lru-cache.js');
const { Adapter, RESOURCE, SEARCH_LIMIT } = require('#@/adapters/es/adapter.js');
const projectService = require('#@/services/project-service.js');
const Logger = require('#@/config/logger.js');

/**
 * Refresh project data and counts
 */
const refreshProjectCache = async () => {
  Logger.info('Caching projects metadata');
  const projects = await projectService.listProjects();

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const ontology = await Adapter.get(RESOURCE.ONTOLOGY).find(
      [{ field: 'project_id', value: project.id }],
      {
        size: SEARCH_LIMIT,
      }
    );

    const ontologyMap = {};
    ontology.forEach((o) => {
      ontologyMap[o.label] = o;
    });

    setCache(project.id, {
      ...project,
      ontologyMap,
    });
  }
};

const startProjectCache = (interval) => {
  setInterval(refreshProjectCache, interval);
};

module.exports = { startProjectCache, refreshProjectCache };
