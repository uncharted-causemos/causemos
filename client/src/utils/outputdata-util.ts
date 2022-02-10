import _ from 'lodash';
import {
  RawOutputDataPoint,
  RawOutputGeoJson
} from '@/types/Outputdata';
import { REGION_ID_DELIMETER } from '@/utils/admin-level-util';
import { QUALIFIERS_TO_EXCLUDE } from '@/utils/qualifier-util';
import { AggregationOption } from '@/types/Enums';

// Filter raw data so that the result will contain data points where each data point matches with at least one of the provided regionId
// i.e return data points where each data point matches with regionId[0] or regionId[1] or regionId[n]
export const filterRawDataByRegionIds = (data: RawOutputDataPoint[], regionIds: string[]): RawOutputDataPoint[] => {
  if (!regionIds?.length) return data;
  const adminLevelsList = regionIds.map(regionId => regionId.split(REGION_ID_DELIMETER));
  return data.filter(d => {
    // For each admin ID (adminLevels array), check if data point matches with it.
    const matches = adminLevelsList.map(adminLevels => {
      const level = adminLevels.length - 1;
      const checks = [d.country === adminLevels[0], d.admin1 === adminLevels[1], d.admin2 === adminLevels[2], d.admin3 === adminLevels[3]];
      return checks.slice(0, level + 1).reduce((prev, cur) => prev && cur, true);
    });
    // return true if there is at least one match
    return matches.reduce((prev, cur) => prev || cur, false);
  });
};

export const convertRawDataToGeoJson = (data: RawOutputDataPoint[]) => {
  const geoJson = {
    type: 'FeatureCollection',
    features: []
  } as RawOutputGeoJson;
  for (const d of data) {
    // Check for invalid coordinates and filter out
    if (_.isNumber(d.lng) && _.isNumber(d.lat)) {
      geoJson.features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
        properties: { ...d }
      });
    }
  }
  return geoJson;
};

export const computeTimeseriesFromRawData = (data: RawOutputDataPoint[], aggregation: AggregationOption): { timestamp: number; value: number }[] => {
  // Aggregate spatially and derive timeseries data
  const dataByTs = _.groupBy(data, 'timestamp');
  const timeseries = Object.values(dataByTs).map(dataPoints => {
    const sum = dataPoints.reduce((prev, cur) => prev + cur.value, 0);
    return { timestamp: dataPoints[0].timestamp, value: aggregation === AggregationOption.Sum ? sum : sum / dataPoints.length };
  });
  // TODO: sorting can be expensive for large number of datapoints, further investigate if there's more efficient way to keep the timestamps in order.
  const result = _.sortBy(timeseries, 'timestamp');
  return result;
};

export const pickQualifiers = (dataPoint: RawOutputDataPoint): { [qualifier: string]: string } => {
  return _.omit(dataPoint, QUALIFIERS_TO_EXCLUDE);
};
