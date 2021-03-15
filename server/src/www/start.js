const Logger = rootRequire('/config/logger');

const { set } = rootRequire('/cache/node-lru-cache');
const projectService = rootRequire('/services/project-service');

/**
 * Runs start up jobs, e.g. any type of prefetching of sanity checks
 */
async function runStartup() {
  Logger.info('=== Running server up jobs ===');

  // List all of the projects
  Logger.info('Creating project metadata cache');
  const projects = await projectService.listProjects();
  projects.map(project => {
    set(project.id, project);
  });

  Logger.info('=== Done server start up jobs ===');
}
module.exports = { runStartup };
