import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { IndexProjectionScenario, IndexProjectionSettings } from '@/types/Index';

const defaultScenario: IndexProjectionScenario = {
  id: uuidv4(),
  name: 'No constraint',
  isVisible: true,
  color: '#000',
  description: 'No concepts are constrained in this scenario',
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
