const expect = require('chai').expect;
const graphUtil = rootRequire('util/graph-util');

const edges = [
  { _id: 'a///b' },
  { _id: 'b///c' },
  { _id: 'c///d' }
];

const paths = [
  { _id: 'a///b' },
  { _id: 'b///c' },
  { _id: 'c///d' },
  { _id: 'd///c' },
  { _id: 'c///b' },
  { _id: 'b///a' }
];

const interventionPaths = [
  { _id: 'wm/concept/causal_factor/intervention/foobar///b' },
  { _id: 'b///a' }
];

describe('graph-util', function() {
  it('builds cache', function() {
    const cache = graphUtil.buildGraphCache(edges);
    expect(Object.keys(cache.incoming).length).to.equal(3);
  });

  it('norml path - path found', function() {
    const cache = graphUtil.buildGraphCache(paths);
    const result = graphUtil.normalPath(cache.incoming, ['a', 'd'], 3);
    expect(result.length).to.equal(2);
  });

  it('norml path - path not found', function() {
    const cache = graphUtil.buildGraphCache(paths);
    const result1 = graphUtil.normalPath(cache.incoming, ['a', 'd'], 1);
    expect(result1.length).to.equal(0);

    const result2 = graphUtil.normalPath(cache.incoming, ['a', 'x'], 10);
    expect(result2.length).to.equal(0);
  });

  it('interventon path - path found', function() {
    const cache = graphUtil.buildGraphCache(interventionPaths);
    const result1 = graphUtil.interventionPath(cache.incoming, 'a', 3);
    expect(result1.length).to.equal(1);
  });

  it('interventon path - path not found', function() {
    const cache = graphUtil.buildGraphCache(paths);
    const result1 = graphUtil.interventionPath(cache.incoming, 'a', 3);
    expect(result1.length).to.equal(0);
  });
});
