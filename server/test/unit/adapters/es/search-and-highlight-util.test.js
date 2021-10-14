require('dotenv').config();
const { searchAndHighlight } = rootRequire('adapters/es/client');

describe('search-and-highlight-util', function() {
  describe('searchAndHighlight', function () {
    it('ensures searchAndHighlight works', async() => {
      const results = await searchAndHighlight('gadm-name', 'ca', [], ['country', 'admin1']);
      console.log(results);
    });
  });
});
