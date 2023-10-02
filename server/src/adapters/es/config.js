const FIELD_TYPES = Object.freeze({
  NORMAL: 0,
  REGEXP: 1,
  RANGED: 2,
  DATE: 3,
  DATE_MILLIS: 4,
  CUSTOM: 7,
  _QUALITY: 99, // HACK for query-util
});

module.exports = {
  FIELD_TYPES,
};
