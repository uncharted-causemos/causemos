import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { IndexProjectionScenario, IndexProjectionSettings } from '@/types/Index';

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
    isDefault: true,
    constraints: {},
  };
  return newScenario;
};
