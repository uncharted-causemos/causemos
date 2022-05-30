import API from '@/api/api';

/**
 * Fetch bounding box of the regions of provided region ids
 * @param regionIds region ids
 */
export const getBboxFromRegionIds = async (regionIds: string[]): Promise<[[number, number], [number, number]] | null> => {
  const { data } = await API.post('gadm/spanning-bbox', { region_ids: regionIds });
  const { top_left: topLeft, bottom_right: bottomRight } = data;
  if (!topLeft || !bottomRight) return null;
  return [[topLeft.lon, topLeft.lat], [bottomRight.lon, bottomRight.lat]];
};

/**
 * Get bbox for each region id
 * @param regionIds region ids
 * @returns Array of bbox
 */
export const getBboxForEachRegionId = async (regionIds: string[]) => {
  const promises = regionIds.map(regionId => getBboxFromRegionIds([regionId]));
  return Promise.all(promises);
};
