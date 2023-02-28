import * as d3 from 'd3';
import { DiscreteOuputScale } from '@/types/Enums';
import {
  Dataset,
  IndexResultsData,
  IndexResultsContributingDataset,
  IndexResultsSettings,
} from '@/types/Index';
import _ from 'lodash';
import { RegionalAggregation } from '@/types/Outputdata';
import { COLOR, getColors } from './colors-util';

/**
 * Summarizes the countries that are found across multiple datasets.
 * Returns the summary as sets to quickly determine whether a given country is in either.
 * @param regionData a list of RegionalAggregation objects, one for each dataset.
 * @returns two sets representing the country names that are found in all or just some datasets.
 */
export const calculateCoverage = (
  regionData: RegionalAggregation[]
): {
  countriesInAllDatasets: Set<string>;
  countriesInSomeDatasets: Set<string>;
} => {
  if (regionData.length === 0) {
    return {
      countriesInAllDatasets: new Set(),
      countriesInSomeDatasets: new Set(),
    };
  }
  // Pull out a list of just country names (no values) for each dataset
  const countryLists = regionData.map(
    (regionDataForOneDataset) => regionDataForOneDataset.country?.map(({ id }) => id) ?? []
  );
  // Identify countries found in all datasets and those found in only some
  let countriesInAllDatasets = new Set(countryLists[0]);
  const countriesInSomeDatasets = new Set(countryLists[0]);
  countryLists.slice(1).forEach((countryList) => {
    countryList.forEach((country) => {
      // Add all countries to countriesInSomeDatasets
      countriesInSomeDatasets.add(country);
    });
    // Remove all countries in countriesInAllDatasets that aren't found in this one
    //  (take the intersection)
    countriesInAllDatasets = new Set(
      countryList.filter((country) => countriesInAllDatasets.has(country))
    );
  });
  return {
    countriesInAllDatasets,
    countriesInSomeDatasets,
  };
};

/**
 * Multiplies each dataset's overall weight by the value of the country in the dataset.
 * ASSUMES that the relevant data for dataset[i] can be found at overallWeightForEachDataset[i] and
 *  regionDataForEachDataset[i].
 * NOTE: does not sort or filter the results.
 * @param country the name string of the country that indicates which values to look for.
 * @param datasets All dataset nodes in the index.
 * @param overallWeightForEachDataset The overall weight for each node.
 * @param regionDataForEachDataset The regional data for each node.
 * @returns a list of IndexResultsContributingDataset objects.
 */
export const calculateContributingDatasets = (
  country: string,
  datasets: Dataset[],
  overallWeightForEachDataset: number[],
  regionDataForEachDataset: RegionalAggregation[]
): IndexResultsContributingDataset[] => {
  return datasets.map((dataset, i) => {
    const overallWeight = overallWeightForEachDataset[i];
    const countriesWithValues = regionDataForEachDataset[i].country;
    const datasetValue = countriesWithValues?.find((entry) => entry.id === country)?.value ?? null;
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
 * Calculates the overall value for each country by
 *  - multiplying each dataset's overall weight by the value of the country in the dataset
 *  - adding up all the products
 * While doing so, keeps track of
 *  - how much each dataset contributes to each country's overall value
 *  - whether each country is found in all datasets
 * ASSUMES that the relevant data for dataset[i] can be found at overallWeightForEachDataset[i] and
 *  regionDataForEachDataset[i].
 * NOTE: does not sort or filter the results.
 * @param datasetsWithOverallWeight All dataset nodes in the index.
 * @param overallWeightForEachDataset The overall weight for each node.
 * @param regionDataForEachDataset The regional data for each node.
 */
export const calculateIndexResults = (
  datasets: Dataset[],
  overallWeightForEachDataset: number[],
  regionDataForEachDataset: RegionalAggregation[]
): IndexResultsData[] => {
  const { countriesInSomeDatasets } = calculateCoverage(regionDataForEachDataset);
  return [...countriesInSomeDatasets].map((country) => {
    const contributingDatasets = calculateContributingDatasets(
      country,
      datasets,
      overallWeightForEachDataset,
      regionDataForEachDataset
    );
    const overallValue = _.sum(contributingDatasets.map((entry) => entry.weightedDatasetValue));
    return {
      countryName: country,
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
