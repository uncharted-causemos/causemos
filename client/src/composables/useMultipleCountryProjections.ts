import _ from 'lodash';
import { ref } from 'vue';
import { createProjectionRunner } from '@/utils/projection-util';
import {
  ConceptNode,
  IndexProjection,
  IndexProjectionCountry,
  IndexProjectionNodeDataWarning,
} from '@/types/Index';
import { TimeseriesPoint } from '@/types/Timeseries';
import { IndexWeightingBehaviour, TemporalResolutionOption } from '@/types/Enums';
import { checkProjectionWarnings } from '@/utils/index-projection-util';

export default function useMultipleCountryProjections() {
  const multipleCountryProjectionData = ref<IndexProjection[]>([]);
  const dataWarnings = ref<{ [nodeId: string]: IndexProjectionNodeDataWarning[] }>({});

  /**
   * Run projections for the tree with historical data for the given countries
   */
  const runMultipleCountryProjections = (
    conceptTree: ConceptNode,
    historicalDataForSelectedCountries: {
      [countryName: string]: { [nodeId: string]: TimeseriesPoint[] };
    },
    targetPeriod: { start: number; end: number },
    dataResOption: TemporalResolutionOption,
    countries: IndexProjectionCountry[],
    weightingBehaviour: IndexWeightingBehaviour
  ) => {
    multipleCountryProjectionData.value = countries.map((country) => {
      const historicalData = historicalDataForSelectedCountries[country.name];
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
        historicalData,
        targetPeriod,
        dataResOption,
        weightingBehaviour
      ).runProjection();
      retVal.result = runner.getResults();
      retVal.runInfo = runner.getRunInfo();
      return retVal;
    });
    dataWarnings.value = checkProjectionWarnings(
      multipleCountryProjectionData.value,
      historicalDataForSelectedCountries,
      targetPeriod
    );
  };

  return {
    multipleCountryProjectionData,
    dataWarnings,
    runMultipleCountryProjections,
  };
}
