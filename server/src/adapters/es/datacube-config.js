const { FIELD_TYPES } = require('./config');

const makeRanges = (startYear, endYear) => {
  return [...Array(endYear - startYear)].map((_, i) => ({
    from: startYear + i,
    to: startYear + 1 + i,
  }));
};

const FIELD_LEVELS = Object.freeze({
  DATACUBE: 0,
  CONCEPTS: 1,
});

const NESTED_FIELD_PATHS = Object.freeze({
  CONCEPTS: 'ontology_matches',
});

const FIELDS = Object.freeze({
  id: {
    fields: ['id'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  dataId: {
    fields: ['data_id'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  newVersionId: {
    fields: ['new_version_data_id'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  keyword: {
    // Search only, fields are for hardwired in datacube-query-util in order for score boosting to work
    fields: [],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.DATACUBE,
  },
  category: {
    fields: ['category'],
    aggFields: ['category.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  domain: {
    fields: ['domains'],
    aggFields: ['domains.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  createdAt: {
    fields: ['created_at'],
    type: FIELD_TYPES.DATE_MILLIS,
    level: FIELD_LEVELS.DATACUBE,
  },
  description: {
    fields: ['description'],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.DATACUBE,
  },
  dataSensitivity: {
    fields: ['data_sensitivity'],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.DATACUBE,
  },
  dataQuality: {
    fields: ['data_quality'],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.DATACUBE,
  },
  country: {
    fields: ['geography.country'],
    aggFields: ['geography.country.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  admin1: {
    fields: ['geography.admin1'],
    aggFields: ['geography.admin1.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  admin2: {
    fields: ['geography.admin2'],
    aggFields: ['geography.admin2.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  admin3: {
    fields: ['geography.admin3'],
    aggFields: ['geography.admin3.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  geoGranularity: {
    fields: ['data_info.region_levels'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  isStochastic: {
    fields: ['is_stochastic'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  maintainerName: {
    fields: ['maintainer.name'],
    aggFields: ['maintainer.name.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  maintainerOrg: {
    fields: ['maintainer.organization'],
    aggFields: ['maintainer.organization.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  name: {
    fields: ['name'],
    aggFields: ['name.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  familyName: {
    fields: ['family_name'],
    aggFields: ['family_name.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  status: {
    fields: ['status'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  period: {
    fields: ['period.gte', 'period.lte'],
    type: FIELD_TYPES.DATE_MILLIS,
    level: FIELD_LEVELS.DATACUBE,
    range: makeRanges(1970, 2024),
  },
  tags: {
    fields: ['tags'],
    aggFields: ['tags.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  type: {
    fields: ['type'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  temporalResolution: {
    fields: ['outputs.data_resolution.temporal_resolution'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  variableDescription: {
    fields: ['outputs.description', 'parameters.description'],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.DATACUBE,
  },
  variableName: {
    fields: ['outputs.display_name', 'parameters.display_name'],
    aggFields: ['outputs.display_name.raw', 'parameters.display_name.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  variableUnit: {
    fields: ['outputs.unit', 'parameters.unit'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.DATACUBE,
  },
  variableUnitDescription: {
    fields: ['outputs.unit_description', 'parameters.unit_description'],
    type: FIELD_TYPES.REGEXP,
    level: FIELD_LEVELS.DATACUBE,
  },

  // Concepts
  conceptName: {
    fields: ['ontology_matches.name'],
    aggFields: ['ontology_matches.name.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.CONCEPTS,
  },
  conceptScore: {
    fields: ['ontology_matches.score'],
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
      { from: 0.9, to: '--' },
    ],
  },
});

module.exports = {
  FIELDS,
  FIELD_TYPES,
  FIELD_LEVELS,
  NESTED_FIELD_PATHS,
};
