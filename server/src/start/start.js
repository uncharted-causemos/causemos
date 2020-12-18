const Logger = rootRequire('/config/logger');

const { set } = rootRequire('/cache/node-lru-cache');
const projectService = rootRequire('/services/project-service');
const { Adapter, RESOURCE } = rootRequire('adapters/es/adapter');

/**
 * Runs start up jobs, e.g. any type of prefetching of sanity checks
 */
async function runStartup() {
  Logger.info('=== Running server up jobs ===');

  // List all of the projects
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

  projects.map(project => {
    set(project.id, {
      ...project,
      stat: {
        model_count: projectModelsMap[project.id] || 0,
        data_analysis_count: projectAnalysesMap[project.id] || 0
      }
    });
  });
  Logger.info('=== Done server start up jobs ===');
}
module.exports = { runStartup };
