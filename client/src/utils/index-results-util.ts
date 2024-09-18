import * as d3 from 'd3';
import { AdminLevel, DiscreteOuputScale } from '@/types/Enums';
import {
  IndexResultsData,
  IndexResultsContributingDataset,
  IndexResultsSettings,
  ConceptNodeWithDatasetAttached,
} from '@/types/Index';
import _ from 'lodash';
import { RegionalAggregation } from '@/types/Outputdata';
import { COLOR, getColors } from './colors-util';

/**
 * Summarizes the regions that are found across multiple datasets.
 * Returns the summary as sets to quickly determine whether a given region is in either.
 * @param regionData a list of RegionalAggregation objects, one for each dataset.
 * @param aggregationLevel returns regions at this admin level (e.g. 'country', 'admin1', ...).
 * @returns two sets representing the region IDs that are found in all or just some datasets.
 */
export const calculateCoverage = (
  regionData: RegionalAggregation[],
  aggregationLevel: AdminLevel
): {
  regionsInAllDatasets: Set<string>;
  regionsInSomeDatasets: Set<string>;
} => {
  if (regionData.length === 0) {
    return {
      regionsInAllDatasets: new Set(),
      regionsInSomeDatasets: new Set(),
    };
  }
  // Pull out a list of just region IDs (no values) for each dataset
  const regionLists = regionData.map(
    (regionDataForOneDataset) =>
      regionDataForOneDataset[aggregationLevel]?.map(({ id }) => id) ?? []
  );
  // Identify regions found in all datasets and those found in only some
  let regionsInAllDatasets = new Set(regionLists[0]);
  const regionsInSomeDatasets = new Set(regionLists[0]);
  regionLists.slice(1).forEach((regionList) => {
    regionList.forEach((region) => {
      // Add all regions to regionsInSomeDatasets
      regionsInSomeDatasets.add(region);
    });
    // Remove all regions in regionsInAllDatasets that aren't found in this one
    //  (take the intersection)
    regionsInAllDatasets = new Set(regionList.filter((region) => regionsInAllDatasets.has(region)));
  });
  return {
    regionsInAllDatasets,
    regionsInSomeDatasets,
  };
};

/**
 * Multiplies each dataset's overall weight by the value of the region in the dataset.
 * ASSUMES that the relevant data for dataset[i] can be found at overallWeightForEachDataset[i] and
 *  regionDataForEachDataset[i].
 * NOTE: does not sort or filter the results.
 * @param region the ID string of the region that indicates which values to look for.
 * @param datasets All dataset nodes in the index.
 * @param overallWeightForEachDataset The overall weight for each node.
 * @param regionDataForEachDataset The regional data for each node.
 * @param aggregationLevel The admin level of the region to search for.
 * @returns a list of IndexResultsContributingDataset objects.
 */
export const calculateContributingDatasets = (
  regionId: string,
  datasets: ConceptNodeWithDatasetAttached[],
  overallWeightForEachDataset: number[],
  regionDataForEachDataset: RegionalAggregation[],
  aggregationLevel: AdminLevel
): IndexResultsContributingDataset[] => {
  return datasets.map((dataset, i) => {
    const overallWeight = overallWeightForEachDataset[i];
    const regionsWithValues = regionDataForEachDataset[i][aggregationLevel];
    const datasetValue = regionsWithValues?.find((entry) => entry.id === regionId)?.value ?? null;
    const weightedDatasetValue = datasetValue !== null ? datasetValue * overallWeight : null;
    return {
      overallWeight,
      dataset,
      datasetValue,
      weightedDatasetValue,
    };
  });
};

/**
 * Calculates the overall value for each region by
 *  - multiplying each dataset's overall weight by the value of the region in the dataset
 *  - adding up all the products
 * While doing so, keeps track of
 *  - how much each dataset contributes to each region's overall value
 *  - whether each region is found in all datasets
 * ASSUMES that the relevant data for dataset[i] can be found at overallWeightForEachDataset[i] and
 *  regionDataForEachDataset[i].
 * NOTE: does not sort or filter the results.
 * @param datasetsWithOverallWeight All dataset nodes in the index.
 * @param overallWeightForEachDataset The overall weight for each node.
 * @param regionDataForEachDataset The regional data for each node.
 * @param aggregationLevel Regions at this admin level will be returned.
 */
export const calculateIndexResults = (
  datasets: ConceptNodeWithDatasetAttached[],
  overallWeightForEachDataset: number[],
  regionDataForEachDataset: RegionalAggregation[],
  aggregationLevel: AdminLevel
): IndexResultsData[] => {
  const { regionsInSomeDatasets } = calculateCoverage(regionDataForEachDataset, aggregationLevel);
  return [...regionsInSomeDatasets].map((regionId) => {
    const contributingDatasets = calculateContributingDatasets(
      regionId,
      datasets,
      overallWeightForEachDataset,
      regionDataForEachDataset,
      aggregationLevel
    );
    const overallValue = _.sum(contributingDatasets.map((entry) => entry.weightedDatasetValue));
    return {
      regionId,
      value: overallValue,
      contributingDatasets,
    };
  });
};

/**
 * Create a new index results settings with default values
 */
export const createNewIndexResultsSettings = (): IndexResultsSettings => {
  return {
    color: COLOR.PRIORITIZATION,
    colorScale: DiscreteOuputScale.Quantize,
    numberOfColorBins: 5,
  };
};

/**
 * Get data domain for index results data based on the provided scale
 * @param data An index results data
 * @param scale Discrete output scale. e.g. `Quantize` | `Quantile`
 */
export const getIndexResultsDataDomain = (data: IndexResultsData[], scale: DiscreteOuputScale) => {
  const DEFAULT_DOMAIN = [0, 100];
  const domain =
    scale === DiscreteOuputScale.Quantile
      ? data.map((item) => item.value as number)
      : DEFAULT_DOMAIN;
  return domain;
};

/**
 * Get the color scale configuration for the given index results data based on the provided index results settings
 * @param data An index results data
 * @param settings An index results settings
 */
export const getIndexResultsColorConfig = (
  data: IndexResultsData[],
  settings: IndexResultsSettings
) => {
  const domain = getIndexResultsDataDomain(data, settings.colorScale);
  const colors = getColors(settings.color, settings.numberOfColorBins);
  let scaleFn: d3.ScaleQuantize<string, never> | d3.ScaleQuantile<string, never> = d3.scaleQuantize(
    domain,
    colors
  );
  if (settings.colorScale === DiscreteOuputScale.Quantile) {
    scaleFn = d3.scaleQuantile(domain, colors);
  }
  return {
    domain,
    colors: getColors(settings.color, settings.numberOfColorBins),
    scale: settings.colorScale,
    scaleFn,
  };
};
