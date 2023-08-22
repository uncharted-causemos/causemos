const { v4: uuid } = require('uuid');
const { Base } = require('./base');

class Project extends Base {
  /**
   * Get cluster health of an index.
   *
   * @param {string} index - Name of index
   */
  async health(index) {
    const response = await this.client.cluster.health({
      index,
      level: 'indices',
    });
    return response.body.indices[index];
  }

  /**
   * Create a new entry in the project index.
   *
   * @param {string} projectName - Project name
   * @param {string} projectDescription - Project Description
   */
  async create(projectName, projectDescription) {
    const projectId = `project-${uuid()}`;

    // Add project entry
    await this.client.index({
      id: projectId,
      index: this.index,
      refresh: 'wait_for',
      body: {
        id: projectId,
        kb_id: '', // TODO: remove
        name: projectName,
        description: projectDescription,
        created_at: Date.now(),
        modified_at: Date.now(),
        extended_at: Date.now(), // Last time additional documents were added to the project // TODO: remove
      },
    });

    return projectId;
  }
}

module.exports = { Project };
