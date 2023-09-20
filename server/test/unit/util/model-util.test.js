const expect = require('chai').expect;
const modelUtil = require('#@/util/model-util.js');

const conflictingPolarityStatements = [1, 1, -1];

const unknownPolarityStatements = [1, 0, 1];

const sameStatements = [1, 1, 1];

describe('model-util', function () {
  it('has same and opposite polarity', function () {
    const result = modelUtil.isEdgeAmbiguous(conflictingPolarityStatements);
    expect(result).to.equal(true);
  });

  it('has unknown polarity', function () {
    const result = modelUtil.isEdgeAmbiguous(unknownPolarityStatements);
    expect(result).to.equal(true);
  });

  it('has all same polarity', function () {
    const result = modelUtil.isEdgeAmbiguous(sameStatements);
    expect(result).to.equal(false);
  });

  it('min/max range - regular case', function () {
    const normal = modelUtil.projectionValueRange([1, 2, 3]);
    expect(normal).to.deep.equal({ max: 5, min: 0 });

    const negative = modelUtil.projectionValueRange([-1, -2, -3]);
    expect(negative).to.deep.equal({ max: 1, min: -5 });

    const flat = modelUtil.projectionValueRange([3, 3, 3, 3]);
    expect(flat).to.deep.equal({ max: 6, min: 0 });
  });

  it('min/max range - degenerate case', function () {
    const zero = modelUtil.projectionValueRange([0, 0]);
    expect(zero).to.deep.equal({ max: 1, min: -1 });

    const singular = modelUtil.projectionValueRange([-3]);
    expect(singular).to.deep.equal({ max: 0, min: -6 });
  });
});
