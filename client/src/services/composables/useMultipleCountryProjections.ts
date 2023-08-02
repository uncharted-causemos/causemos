import _ from 'lodash';
import { ref } from 'vue';
import { createProjectionRunner } from '@/utils/projection-util';
import { ConceptNode, IndexProjection, IndexProjectionCountry } from '@/types/Index';
import { TimeseriesPoint } from '@/types/Timeseries';
import { TemporalResolutionOption } from '@/types/Enums';

export default function useMultipleCountryProjections() {
  const multipleCountryProjectionData = ref<IndexProjection[]>([]);

  /**
   * Run projections for the tree with historical data for the given countries
   */
  const runMultipleCountryProjections = (
    conceptTree: ConceptNode,
    historicalDataForSelectedCountries: Map<string, Map<string, TimeseriesPoint[]>>,
    targetPeriod: { start: number; end: number },
    dataResOption: TemporalResolutionOption,
    countries: IndexProjectionCountry[]
  ) => {
    multipleCountryProjectionData.value = countries.map((country) => {
      const historicalData = historicalDataForSelectedCountries.get(country.name);
      const retVal = {
        id: country.name,
        color: country.color,
        name: country.name,
        result: {},
        runInfo: {},
      };
      if (historicalData === undefined) return retVal;
      const runner = createProjectionRunner(
        conceptTree,
        Object.fromEntries(historicalData),
        targetPeriod,
        dataResOption
      ).runProjection();
      retVal.result = runner.getResults();
      retVal.runInfo = runner.getRunInfo();
      return retVal;
    });
  };
  return {
    multipleCountryProjectionData,
    runMultipleCountryProjections,
  };
}
