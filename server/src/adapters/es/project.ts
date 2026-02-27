import { v4 as uuid } from 'uuid';
import { Base } from './base';

export class Project extends Base {
  async health(index: string): Promise<any> {
    const response = await this.client.cluster.health({ index, level: 'indices' });
    return (response.body as any).indices[index];
  }

  async create(projectName: string, projectDescription: string): Promise<string> {
    const projectId = `project-${uuid()}`;
    const now = Date.now();
    await this.client.index({
      id: projectId,
      index: this.index,
      refresh: 'wait_for',
      body: {
        id: projectId,
        name: projectName,
        description: projectDescription,
        created_at: now,
        modified_at: now,
      },
    });
    return projectId;
  }
}
