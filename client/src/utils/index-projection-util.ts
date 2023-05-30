import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { IndexProjection, IndexProjectionScenario, IndexProjectionSettings } from '@/types/Index';
import { ProjectionTimeseries } from '@/types/Timeseries';

const defaultScenario: IndexProjectionScenario = {
  id: uuidv4(),
  name: 'No constraints',
  description: 'No concepts are constrained in this scenario.',
  color: '#000',
  isVisible: true,
  isDefault: true,
  constraints: {},
};

/**
 * Create a new index projection settings with default values
 */
export const createNewIndexProjectionSettings = (): IndexProjectionSettings => {
  return {
    scenarios: [defaultScenario],
  };
};

export const createNewScenario = (
  name = 'Untitled scenario',
  description: string,
  color: string
) => {
  const newScenario: IndexProjectionScenario = {
    id: uuidv4(),
    name,
    description,
    color: color,
    isVisible: false,
    isDefault: false,
    constraints: {},
  };
  return newScenario;
};

/**
 * Get the array of projection timeseries for the node with given nodeId
 * @param projections a projection list
 * @param nodeId node id
 */
export const getProjectionsForNode = (projections: IndexProjection[], nodeId: string) => {
  const projectionTimeseries: ProjectionTimeseries[] = projections.map((p) => {
    return {
      id: `${p.id}_${nodeId}`,
      name: p.name,
      color: p.color,
      points: p.result[nodeId] || [],
    };
  });
  return projectionTimeseries;
};
