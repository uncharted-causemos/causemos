const { setCache } = rootRequire('/cache/node-lru-cache');
const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('adapters/es/adapter');
const projectService = rootRequire('/services/project-service');
const Logger = rootRequire('/config/logger');

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
