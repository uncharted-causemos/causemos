require('dotenv').config();
const { searchAndHighlight } = rootRequire('adapters/es/client');

describe('search-and-highlight-util', function() {
  describe('buildAggregation', function () {
    it('handles basic terms aggregation', async() => {
      const results = await searchAndHighlight('gadm-name', 'ca', [], ['country', 'admin1']);
      console.log(results);
    });
  });
});
