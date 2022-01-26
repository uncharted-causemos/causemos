const _ = require('lodash');

/**
 *  Check if edge violates the following conditions and is ambiguous
 *  Conditions:
 *  * If an edge has backing statements in "reference_ids", then all the statement polarities should be "same" or "opposite" and no "unknowns" (polarity = 0)
 *  * If an edge has no backing statements in "reference_ids", then edge polarity should be "same" or "opposite" and not "unknown" (polarity = 0)
 *  @param {array} polarities - list of polarities
 */
function isEdgeAmbiguous(polarities) {
  let same = 0;
  let opposite = 0;
  let unknown = 0;
  polarities.forEach(polarity => {
    if (polarity === 1) {
      same++;
    } else if (polarity === -1) {
      opposite++;
    } else {
      unknown++;
    }
  });
  return ((same > 0 && opposite > 0) || unknown > 0);
}


/**
 * Get "available" max and min ranges. This is for the engine to
 * interpret a usable range during projections
 */
const projectionValueRange = (values) => {
  if (_.isEmpty(values)) return { max: 1, min: 0 };

  let max = _.max(values);
  let min = _.min(values);

  if (max === min && max === 0) {
    max = 1;
    min = -1;
  } else if (max === min) {
    const magnitude = Math.abs(max);
    max += magnitude;
    min -= magnitude;
  } else {
    const magnitude = Math.abs(max - min);
    max += magnitude;
    min -= magnitude;
  }
  return { max, min };
};


const MODEL_STATUS = {
  NOT_REGISTERED: 0,
  TRAINING: 1,
  READY: 2
};

const RESET_ALL_ENGINE_STATUS = {
  delphi: MODEL_STATUS.NOT_REGISTERED,
  dyse: MODEL_STATUS.NOT_REGISTERED,
  delphi_dev: MODEL_STATUS.NOT_REGISTERED,
  sensei: MODEL_STATUS.NOT_REGISTERED
};

module.exports = {
  isEdgeAmbiguous,
  projectionValueRange,
  MODEL_STATUS,
  RESET_ALL_ENGINE_STATUS
};
