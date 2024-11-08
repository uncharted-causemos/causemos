const { Base } = require('./base');

// target index
const GADM_NAME = 'gadm-name';

class Regions extends Base {
  async countries() {
    try {
      const response = await this.client.search({
        index: GADM_NAME,
        size: 0,
        body: {
          aggs: {
            countries: {
              terms: {
                field: 'country.raw',
                size: 1000,
              },
            },
          },
        },
      });
      const countries = response.body.aggregations.countries;
      let countriesArray = [];
      countries.buckets.forEach((bucket) => {
        countriesArray = [...countriesArray, bucket.key];
      }, []);
      return countriesArray;
    } catch (e) {
      console.log(JSON.stringify(e));
    }
  }

  async countriesWithISO3Code() {
    try {
      const response = await this.client.search({
        index: GADM_NAME,
        size: 0,
        // Get all documents aggregated by country, with one "top hit" example document per country
        body: {
          aggs: {
            countries: {
              terms: {
                field: 'country.raw',
                size: 1000,
              },
              aggs: {
                documents: {
                  top_hits: {
                    size: 1,
                  },
                },
              },
            },
          },
        },
      });
      // Pull out the country name and the ISO3 code from the first document in each country
      const documentsByCountry = response.body.aggregations.countries.buckets;
      const countriesWithISO3Code = documentsByCountry.map((country) => {
        const firstDocumentInCountry = country.documents.hits.hits[0];
        const countryCode = firstDocumentInCountry._source.code.split('.')[0];
        return { gadmName: country.key, iso3Code: countryCode };
      });
      return countriesWithISO3Code;
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = { Regions };
