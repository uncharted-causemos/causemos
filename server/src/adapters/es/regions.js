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
}

module.exports = { Regions };
