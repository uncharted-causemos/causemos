const _ = require('lodash');
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
   * Clone indra statements into project index. Function returns immediately does not wait for clone to finish.
   *
   * @param {string} indraStatementIndex - Name of the source index to clone (the indra statements)
   * @param {string} projectName - Project name
   * @param {string} projectDescription - Project Description
   */
  async clone(indraStatementIndex, projectName, projectDescription) {
    // Get new project index attributes
    let response = await this.client.search({
      index: 'knowledge-base',
      size: 1,
      body: {
        query: {
          bool: {
            filter: {
              term: {
                id: indraStatementIndex,
              },
            },
          },
        },
      },
    });
    const kb = response.body.hits.hits[0]._source;
    const project = {
      id: `project-${uuid()}`,
      name: projectName,
      description: projectDescription,
      ontology: kb.ontology,
    };

    // Get new project index settings
    response = await this.client.indices.getSettings({
      index: indraStatementIndex,
    });
    const srcSettings = response.body[indraStatementIndex].settings;

    const projectSettings = {
      'index.number_of_shards': _.get(srcSettings, 'index.number_of_shards') || 5,
      'index.number_of_replicas': _.get(srcSettings, 'index.number_of_replicas') || 0,
      'index.analysis': _.get(srcSettings, 'index.analysis') || {},
      'index.blocks.write': false,
      'index.blocks.read_only': false,
    };

    // Add project entry
    response = await this.client.index({
      id: project.id,
      index: this.index,
      refresh: 'wait_for',
      body: {
        id: project.id,
        kb_id: indraStatementIndex,
        name: project.name,
        description: project.description,
        ontology: project.ontology,
        created_at: Date.now(),
        modified_at: Date.now(),
        corpus_id: kb.corpus_id,
        extended_at: Date.now(), // Last time additional documents were added to the project
      },
    });

    // Clone project
    response = await this.client.indices.clone({
      index: indraStatementIndex,
      target: project.id,
      body: {
        settings: projectSettings,
      },
    });

    return response.body;
  }
}

module.exports = { Project };
