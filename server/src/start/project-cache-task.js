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

  const projectModels = await Adapter.get(RESOURCE.MODEL).getFacets('project_id');
  const projectModelsMap = projectModels.reduce((acc, d) => {
    acc[d.key] = d.doc_count;
    return acc;
  }, {});

  const projectAnalyses = await Adapter.get(RESOURCE.ANALYSIS).getFacets('project_id');
  const projectAnalysesMap = projectAnalyses.reduce((acc, d) => {
    acc[d.key] = d.doc_count;
    return acc;
  }, {});


  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const ontology = await Adapter.get(RESOURCE.ONTOLOGY).find([
      { field: 'project_id', value: project.id }
    ], {
      size: SEARCH_LIMIT
    });

    const ontologyMap = {};
    ontology.forEach(o => {
      ontologyMap[o.label] = o;
    });

    setCache(project.id, {
      ...project,
      ontologyMap,
      stat: {
        model_count: projectModelsMap[project.id] || 0,
        data_analysis_count: projectAnalysesMap[project.id] || 0
      }
    });
  }
};

const startProjectCache = (interval) => {
  setInterval(refreshProjectCache, interval);
};

module.exports = { startProjectCache, refreshProjectCache };
