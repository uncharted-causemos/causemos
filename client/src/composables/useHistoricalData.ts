import { ConceptNode } from '@/types/Index';
import { findAllDatasets } from '@/utils/index-tree-util';
import { Ref, ref, watch } from 'vue';
import { getTimeseries, TRANSFORM_NORM } from '../services/outputdata-service';
import { TimeseriesPoint } from '@/types/Timeseries';
import { NO_COUNTRY_SELECTED_VALUE } from '@/utils/index-projection-util';

export default function useHistoricalData(countries: Ref<string[]>, indexTree: Ref<ConceptNode>) {
  // Contains data for each country, for each node with a dataset attached.
  //  A country name can be used as a map key to access another map.
  //  The result contains data for each node, with the node's ID as the key.
  const historicalData = ref<{ [countryName: string]: { [nodeId: string]: TimeseriesPoint[] } }>(
    {}
  );
  // Whenever the tree or list of countries changes, fetch timeseries for all datasets in the tree.
  watch([indexTree, countries], async () => {
    // Save a reference to the current version of the tree and the current list of countries so
    //  that if either changes before all of the fetch requests return, we only perform calculations and update the state with the most up-to-date tree structure and list of countries.
    const frozenTreeState = indexTree.value;
    const frozenCountryList = countries.value;
    // Go through tree and pull out all the nodes with datasets.
    const nodesWithDatasets = findAllDatasets(indexTree.value);
    const mapForAllCountries: { [countryName: string]: { [nodeId: string]: TimeseriesPoint[] } } =
      {};
    const promises = countries.value.map(async (country) => {
      // Don't fetch data unless an actual country is selected.
      if (country === NO_COUNTRY_SELECTED_VALUE) {
        return;
      }
      // For each node with a dataset, fetch the current country's timeseries
      const promises = nodesWithDatasets.map(async ({ dataset }) => {
        const { config } = dataset;
        const data = ((await getTimeseries({
          modelId: config.datasetId,
          runId: config.runId,
          outputVariable: config.outputVariable,
          temporalResolution: config.temporalResolution,
          temporalAggregation: config.temporalAggregation,
          spatialAggregation: config.spatialAggregation,
          regionId: country,
          transform: TRANSFORM_NORM,
        })) || []) as TimeseriesPoint[];
        return data;
      });
      // Wait for all fetches to complete.
      const timeseriesForEachDataset = await Promise.all(promises);
      if (indexTree.value !== frozenTreeState || countries.value !== frozenCountryList) {
        // Tree has changed since the fetches began, so ignore these results.
        return;
      }
      // Convert to map structure
      const mapForThisCountry: { [nodeId: string]: TimeseriesPoint[] } = {};
      timeseriesForEachDataset.forEach((timeseries, i) => {
        const nodeId = nodesWithDatasets[i].id;
        mapForThisCountry[nodeId] = timeseries;
      });
      mapForAllCountries[country] = mapForThisCountry;
    });
    await Promise.all(promises);
    historicalData.value = mapForAllCountries;
  });

  return { historicalData };
}
