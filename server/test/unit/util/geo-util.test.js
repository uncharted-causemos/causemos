const expect = require('chai').expect;
const geoUtil = rootRequire('/util/geo-util');

const GEO_BOUNDS = {
  top: 40.8,
  bottom: 40.4,
  left: -73.7,
  right: -74.1
};
const ONE_AND_A_HALF_BILLION_METERS = 1500000000;
const TEN_MILLION_METERS = 10000000;

describe('geo-util', function() {
  // Testing example provided in elasticsearch docs: https://www.elastic.co/guide/en/elasticsearch/guide/current/geohash-grid-agg.html
  it('bounding box area should be approximately correct', () => {
    const area = geoUtil.getBoundingBoxArea(GEO_BOUNDS);
    expect(area).to.be.closeTo(ONE_AND_A_HALF_BILLION_METERS, TEN_MILLION_METERS);
  });
});
