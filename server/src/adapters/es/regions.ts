import { Base } from './base';

const GADM_NAME = 'gadm-name';

export class Regions extends Base {
  async countries(): Promise<string[]> {
    try {
      const response = await this.client.search({
        index: GADM_NAME,
        size: 0,
        body: {
          aggs: { countries: { terms: { field: 'country.raw', size: 1000 } } },
        },
      });
      const countries = (response.body as any).aggregations.countries;
      let countriesArray: string[] = [];
      countries.buckets.forEach((bucket: any) => {
        countriesArray = [...countriesArray, bucket.key];
      });
      return countriesArray;
    } catch (e) {
      console.log(JSON.stringify(e));
      return [];
    }
  }

  async countriesWithISO3Code(): Promise<{ gadmName: string; iso3Code: string }[]> {
    try {
      const response = await this.client.search({
        index: GADM_NAME,
        size: 0,
        body: {
          aggs: {
            countries: {
              terms: { field: 'country.raw', size: 1000 },
              aggs: { documents: { top_hits: { size: 1 } } },
            },
          },
        },
      });
      const documentsByCountry = (response.body as any).aggregations.countries.buckets;
      return documentsByCountry.map((country: any) => {
        const firstDocumentInCountry = country.documents.hits.hits[0];
        const countryCode = firstDocumentInCountry._source.code.split('.')[0];
        return { gadmName: country.key, iso3Code: countryCode };
      });
    } catch (e) {
      console.log(e);
      return [];
    }
  }
}
