const _ = require('lodash');


/**
 * Create a common ES filter based on frequently used fields
 */
const createFilter = ({
  runId,
  feature,
  model,
  zoom
}) => {
  const filter = [];
  // Run id
  if (!_.isNil(runId)) {
    filter.push({
      term: {
        run_id: runId
      }
    });
  }

  // Feature
  if (!_.isNil(feature)) {
    filter.push({
      term: {
        feature_name: feature
      }
    });
  }

  if (!_.isNil(model)) {
    filter.push({
      term: {
        model: model
      }
    });
  }

  if (!_.isNil(zoom)) {
    filter.push({
      term: {
        zoom
      }
    });
  }
  return filter;
};


module.exports = {
  createFilter
};
