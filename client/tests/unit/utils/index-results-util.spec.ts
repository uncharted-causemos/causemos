import { calculateCoverage, getIndexResultsColorConfig } from '@/utils/index-results-util';
import { COLOR } from '@/utils/colors-util';
import { AdminLevel, DiscreteOuputScale } from '@/types/Enums';
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
      admin1: [
        { id: 'Admin L1 Region A', value: 0 },
        { id: 'Admin L1 Region B', value: 0 },
        { id: 'Admin L1 Region C', value: 0 },
      ],
    };
    const disjointDataset: RegionalAggregation = {
      country: [
        { id: 'Country D', value: 0 },
        { id: 'Country E', value: 0 },
        { id: 'Country F', value: 0 },
      ],
      admin1: [
        { id: 'Admin L1 Region D', value: 0 },
        { id: 'Admin L1 Region E', value: 0 },
        { id: 'Admin L1 Region F', value: 0 },
      ],
    };
    it('should return empty sets when passed an empty array', () => {
      const { regionsInAllDatasets, regionsInSomeDatasets } = calculateCoverage(
        [],
        AdminLevel.Country
      );
      expect(regionsInAllDatasets.size).to.equal(0);
      expect(regionsInSomeDatasets.size).to.equal(0);
    });
    it('should return empty sets when passed an empty array with a lower admin level', () => {
      const { regionsInAllDatasets, regionsInSomeDatasets } = calculateCoverage(
        [],
        AdminLevel.Admin1
      );
      expect(regionsInAllDatasets.size).to.equal(0);
      expect(regionsInSomeDatasets.size).to.equal(0);
    });
    it('should return sets with all countries when passed an array with one item', () => {
      const { regionsInAllDatasets, regionsInSomeDatasets } = calculateCoverage(
        [mockData],
        AdminLevel.Country
      );
      const mockCountryList = mockData.country?.map(({ id }) => id) ?? [];
      expect(regionsInAllDatasets).to.have.all.keys(...mockCountryList);
      expect(regionsInSomeDatasets).to.have.all.keys(...mockCountryList);
    });
    it('should return sets with all L1 regions when passed an array with one item', () => {
      const { regionsInAllDatasets, regionsInSomeDatasets } = calculateCoverage(
        [mockData],
        AdminLevel.Admin1
      );
      const mockRegionList = mockData.admin1?.map(({ id }) => id) ?? [];
      expect(regionsInAllDatasets).to.have.all.keys(...mockRegionList);
      expect(regionsInSomeDatasets).to.have.all.keys(...mockRegionList);
    });
    describe('regionsInAllDatasets', () => {
      it('should be an empty set when two datasets have no overlap', () => {
        const { regionsInAllDatasets } = calculateCoverage(
          [mockData, disjointDataset],
          AdminLevel.Country
        );
        expect(regionsInAllDatasets.size).to.equal(0);
      });
      it('should correctly return the intersection when two datasets have some overlap', () => {
        const overlappingDataset: RegionalAggregation = {
          country: [
            { id: 'Country C', value: 0 },
            { id: 'Country D', value: 0 },
            { id: 'Country E', value: 0 },
          ],
        };
        const { regionsInAllDatasets } = calculateCoverage(
          [mockData, overlappingDataset],
          AdminLevel.Country
        );
        expect(regionsInAllDatasets).to.have.key('Country C');
      });
      it('should correctly return the intersection when two datasets have some overlap at L1', () => {
        const overlappingDataset: RegionalAggregation = {
          admin1: [
            { id: 'Admin L1 Region C', value: 0 },
            { id: 'Admin L1 Region D', value: 0 },
            { id: 'Admin L1 Region E', value: 0 },
          ],
        };
        const { regionsInAllDatasets } = calculateCoverage(
          [mockData, overlappingDataset],
          AdminLevel.Admin1
        );
        expect(regionsInAllDatasets).to.have.key('Admin L1 Region C');
      });
    });
    describe('regionsInSomeDatasets at the country level', () => {
      const { regionsInSomeDatasets } = calculateCoverage(
        [mockData, disjointDataset],
        AdminLevel.Country
      );
      it('should have a size equal to the size of the union when passed two datasets', () => {
        const expectedSize =
          (mockData.country?.length ?? 0) + (disjointDataset.country?.length ?? 0);
        expect(regionsInSomeDatasets.size).to.equal(expectedSize);
      });
      it('should contain all regions found in both input datasets', () => {
        const mockCountryList = mockData.country?.map(({ id }) => id) ?? [];
        expect(regionsInSomeDatasets).to.include.all.keys(...mockCountryList);
        const disjointCountryList = mockData.country?.map(({ id }) => id) ?? [];
        expect(regionsInSomeDatasets).to.include.all.keys(...disjointCountryList);
      });
    });
    describe('regionsInSomeDatasets at the subnational level', () => {
      const { regionsInSomeDatasets } = calculateCoverage(
        [mockData, disjointDataset],
        AdminLevel.Admin1
      );
      it('should have a size equal to the size of the union when passed two datasets', () => {
        const expectedSize = (mockData.admin1?.length ?? 0) + (disjointDataset.admin1?.length ?? 0);
        expect(regionsInSomeDatasets.size).to.equal(expectedSize);
      });
      it('should contain all regions found in both input datasets', () => {
        const mockRegionList = mockData.admin1?.map(({ id }) => id) ?? [];
        expect(regionsInSomeDatasets).to.include.all.keys(...mockRegionList);
        const disjointRegionList = mockData.admin1?.map(({ id }) => id) ?? [];
        expect(regionsInSomeDatasets).to.include.all.keys(...disjointRegionList);
      });
    });
  });
  describe('getIndexResultsColorConfig', () => {
    it('should return a configuration with quantize scale', () => {
      const indexResultsData: IndexResultsData[] = [
        { regionId: 'C1', value: 0, contributingDatasets: [] },
        { regionId: 'C2', value: 10, contributingDatasets: [] },
        { regionId: 'C3', value: 20, contributingDatasets: [] },
        { regionId: 'C4', value: 50, contributingDatasets: [] },
        { regionId: 'C5', value: 100, contributingDatasets: [] },
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
        { regionId: 'C1', value: 0, contributingDatasets: [] },
        { regionId: 'C2', value: 5, contributingDatasets: [] },
        { regionId: 'C3', value: 10, contributingDatasets: [] },
        { regionId: 'C4', value: 20, contributingDatasets: [] },
        { regionId: 'C5', value: 50, contributingDatasets: [] },
        { regionId: 'C6', value: 100, contributingDatasets: [] },
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
