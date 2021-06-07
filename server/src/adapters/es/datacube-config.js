const FIELD_TYPES = Object.freeze({
  NORMAL: 0,
  REGEXP: 1,
  RANGED: 2,
  DATE: 3,
  CUSTOM: 7
});

const FIELD_LEVELS = Object.freeze({
  DATACUBE: 0,
  CONCEPTS: 1
});

const NESTED_FIELD_PATHS = Object.freeze({
  CONCEPTS: 'concepts'
});

const FIELDS = Object.freeze({
  id: {
    fields: ['id'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE
  },
  keyword: { // For search only
    fields: ['_search'],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.DATACUBE
  },
  category: {
    fields: ['category'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE
  },
  createdAt: {
    fields: ['created_at'],
    type: FIELD_TYPES.DATE,
    level: FIELD_LEVELS.DATACUBE
  },
  description: {
    fields: ['description'],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.DATACUBE
  },
  country: {
    fields: ['geography.country'],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.DATACUBE
  },
  admin1: {
    fields: ['geography.admin1'],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.DATACUBE
  },
  admin2: {
    fields: ['geography.admin2'],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.DATACUBE
  },
  admin3: {
    fields: ['geography.admin3'],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.DATACUBE
  },
  isStochastic: {
    fields: ['is_stochastic'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE
  },
  maintainerName: {
    fields: ['maintainer.name'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE
  },
  maintainerOrg: {
    fields: ['maintainer.organization'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE
  },
  name: {
    fields: ['name'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE
  },
  status: {
    fields: ['status'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE
  },
  timePeriod: {
    fields: ['period.gte', 'period.lte'],
    type: FIELD_TYPES.RANGED,
    level: FIELD_LEVELS.DATACUBE
  },
  tags: {
    fields: ['tags'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE
  },
  type: {
    fields: ['type'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE
  },
  temporalResolution: {
    fields: ['outputs.data_resolution.temporal_resolution'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE
  },
  variableDescription: {
    fields: ['outputs.description', 'parameters.description'],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.DATACUBE
  },
  variableName: {
    fields: ['outputs.display_name', 'parameters.display_name'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE
  },
  variableUnit: {
    fields: ['outputs.unit', 'parameters.unit'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE
  },
  variableUnitDescription: {
    fields: ['outputs.unit_description', 'parameters.unit_description'],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.DATACUBE
  },

  // Concepts
  conceptName: {
    fields: ['concepts.name'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.CONCEPTS
  },
  conceptScore: {
    fields: ['concepts.score'],
    type: FIELD_TYPES.RANGED,
    level: FIELD_LEVELS.CONCEPTS,
    range: [
      { from: 0.0, to: 0.1 },
      { from: 0.1, to: 0.2 },
      { from: 0.2, to: 0.3 },
      { from: 0.3, to: 0.4 },
      { from: 0.4, to: 0.5 },
      { from: 0.5, to: 0.6 },
      { from: 0.6, to: 0.7 },
      { from: 0.7, to: 0.8 },
      { from: 0.8, to: 0.9 },
      { from: 0.9, to: '--' }
    ]
  }
});

module.exports = {
  FIELDS,
  FIELD_TYPES,
  FIELD_LEVELS,
  NESTED_FIELD_PATHS
};
