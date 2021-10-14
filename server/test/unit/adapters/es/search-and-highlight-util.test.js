require('dotenv').config();
const { searchAndHighlight } = rootRequire('adapters/es/client');
const { RESOURCE } = rootRequire('adapters/es/adapter');

describe('search-and-highlight-util', function() {
  describe('searchAndHighlight', function () {
    it('ensures searchAndHighlight works', async() => {
      await searchAndHighlight(RESOURCE.GADM_NAME, 'ca*', [], ['country', 'admin1']);
    });
  });
});
