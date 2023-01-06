const expect = require('chai').expect;
const graphUtil = rootRequire('util/graph-util');

const edges = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'c' },
  { source: 'c', target: 'd' },
  { source: 'd', target: 'c' },
  { source: 'c', target: 'b' },
  { source: 'b', target: 'a' },
];

const eMulti = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'c' },
  { source: 'b', target: 'd' },
  { source: 'c', target: 'd' },
];

describe('graph-util', function () {
  it('norml path - path found', function () {
    const result = graphUtil.normalPath(edges, ['a', 'd'], 3);
    expect(result.length).to.equal(1);
  });

  it('norml path - multi path', function () {
    const result = graphUtil.normalPath(eMulti, ['a', 'd'], 3);
    expect(result.length).to.equal(2);
  });

  it('norml path - path not found', function () {
    const result1 = graphUtil.normalPath(edges, ['a', 'd'], 1);
    expect(result1.length).to.equal(0);

    const result2 = graphUtil.normalPath(edges, ['a', 'x'], 10);
    expect(result2.length).to.equal(0);
  });
});
