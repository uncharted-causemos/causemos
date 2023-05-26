import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { IndexProjectionScenario, IndexProjectionSettings } from '@/types/Index';
import { COLORS } from './colors-util';

export const NO_COUNTRY_SELECTED_VALUE = '';

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
    selectedCountry: NO_COUNTRY_SELECTED_VALUE,
    selectedCountries: [
      { name: NO_COUNTRY_SELECTED_VALUE, color: '#000' },
      { name: NO_COUNTRY_SELECTED_VALUE, color: COLORS[0] },
    ],
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
