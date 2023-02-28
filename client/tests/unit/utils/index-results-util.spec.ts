import { expect } from 'chai';
import { calculateCoverage, getIndexResultsColorConfig } from '@/utils/index-results-util';
import { COLOR } from '@/utils/colors-util';
import { DiscreteOuputScale } from '@/types/Enums';
import { IndexResultsSettings, IndexResultsData } from '@/types/Index';
import { RegionalAggregation } from '@/types/Outputdata';

describe('index-results-util', () => {
  describe('calculateCoverage', () => {
    const mockData: RegionalAggregation = {
      country: [
        { id: 'Country A', value: 0 },
        { id: 'Country B', value: 0 },
        { id: 'Country C', value: 0 },
      ],
    };
    const disjointDataset: RegionalAggregation = {
      country: [
        { id: 'Country D', value: 0 },
        { id: 'Country E', value: 0 },
        { id: 'Country F', value: 0 },
      ],
    };
    it('should return empty sets when passed an empty array', () => {
      const { countriesInAllDatasets, countriesInSomeDatasets } = calculateCoverage([]);
      expect(countriesInAllDatasets.size).to.equal(0);
      expect(countriesInSomeDatasets.size).to.equal(0);
    });
    it('should return sets with all countries when passed an array with one item', () => {
      const { countriesInAllDatasets, countriesInSomeDatasets } = calculateCoverage([mockData]);
      const mockCountryList = mockData.country?.map(({ id }) => id) ?? [];
      expect(countriesInAllDatasets).to.have.all.keys(...mockCountryList);
      expect(countriesInSomeDatasets).to.have.all.keys(...mockCountryList);
    });
    describe('countriesInAllDatasets', () => {
      it('should be an empty set when two datasets have no overlap', () => {
        const { countriesInAllDatasets } = calculateCoverage([mockData, disjointDataset]);
        expect(countriesInAllDatasets.size).to.equal(0);
      });
      it('should correctly return the intersection when two datasets have some overlap', () => {
        const overlappingDataset: RegionalAggregation = {
          country: [
            { id: 'Country C', value: 0 },
            { id: 'Country D', value: 0 },
            { id: 'Country E', value: 0 },
          ],
        };
        const { countriesInAllDatasets } = calculateCoverage([mockData, overlappingDataset]);
        expect(countriesInAllDatasets).to.have.key('Country C');
      });
    });
    describe('countriesInSomeDatasets', () => {
      const { countriesInSomeDatasets } = calculateCoverage([mockData, disjointDataset]);
      it('should have a size equal to the size of the union when passed two datasets', () => {
        const expectedSize =
          (mockData.country?.length ?? 0) + (disjointDataset.country?.length ?? 0);
        expect(countriesInSomeDatasets.size).to.equal(expectedSize);
      });
      it('should contain all countries found in both input datasets', () => {
        const mockCountryList = mockData.country?.map(({ id }) => id) ?? [];
        expect(countriesInSomeDatasets).to.include.all.keys(...mockCountryList);
        const disjointCountryList = mockData.country?.map(({ id }) => id) ?? [];
        expect(countriesInSomeDatasets).to.include.all.keys(...disjointCountryList);
      });
    });
  });
  describe('getIndexResultsColorConfig', () => {
    it('should return a configuration with quantize scale', () => {
      const indexResultsData: IndexResultsData[] = [
        { countryName: 'C1', value: 0, contributingDatasets: [] },
        { countryName: 'C2', value: 10, contributingDatasets: [] },
        { countryName: 'C3', value: 20, contributingDatasets: [] },
        { countryName: 'C4', value: 50, contributingDatasets: [] },
        { countryName: 'C5', value: 100, contributingDatasets: [] },
      ];
      const settings: IndexResultsSettings = {
        color: COLOR.PRIORITIZATION,
        colorScale: DiscreteOuputScale.Quantize,
        numberOfColorBins: 4,
      };
      const { domain, colors, scale, scaleFn } = getIndexResultsColorConfig(
        indexResultsData,
        settings
      );

      expect(domain).to.deep.equal([0, 100]);
      expect(scale).to.equal(DiscreteOuputScale.Quantize);

      const colorValues = indexResultsData.map((v) => scaleFn(v.value as number));
      expect(colorValues).to.deep.equal([colors[0], colors[0], colors[0], colors[2], colors[3]]);
    });
    it('should return a configuration with quantile scale', () => {
      const indexResultsData: IndexResultsData[] = [
        { countryName: 'C1', value: 0, contributingDatasets: [] },
        { countryName: 'C2', value: 5, contributingDatasets: [] },
        { countryName: 'C3', value: 10, contributingDatasets: [] },
        { countryName: 'C4', value: 20, contributingDatasets: [] },
        { countryName: 'C5', value: 50, contributingDatasets: [] },
        { countryName: 'C6', value: 100, contributingDatasets: [] },
      ];
      const settings: IndexResultsSettings = {
        color: COLOR.PRIORITIZATION,
        colorScale: DiscreteOuputScale.Quantile,
        numberOfColorBins: 3,
      };
      const { domain, colors, scale, scaleFn } = getIndexResultsColorConfig(
        indexResultsData,
        settings
      );

      expect(domain).to.deep.equal([0, 5, 10, 20, 50, 100]);
      expect(scale).to.equal(DiscreteOuputScale.Quantile);

      const colorValues = indexResultsData.map((v) => scaleFn(v.value as number));
      expect(colorValues).to.deep.equal([
        colors[0],
        colors[0],
        colors[1],
        colors[1],
        colors[2],
        colors[2],
      ]);
    });
  });
});
