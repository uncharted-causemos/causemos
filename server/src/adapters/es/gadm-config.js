const { FIELD_TYPES } = require('./config');

const FIELD_LEVELS = Object.freeze({
  GADM: 0
});

const FIELDS = Object.freeze({
  country: {
    fields: ['country'],
    aggFields: ['country.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.GADM
  },
  admin1: {
    fields: ['admin1'],
    aggFields: ['admin1.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.GADM
  },
  admin2: {
    fields: ['admin2'],
    aggFields: ['admin2.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.GADM
  },
  admin3: {
    fields: ['admin3'],
    aggFields: ['admin3.raw'],
    type: FIELD_TYPES.NORMAL,
    level: FIELD_LEVELS.GADM
  }
});

module.exports = {
  FIELDS,
  FIELD_TYPES
};
