import API from '@/api/api';
import { BoundingBox } from '@/types/Common';

const geoBBoxCache = new Map<string, BoundingBox>();

/**
 * Fetch bounding box of the regions of provided region ids
 * @param regionIds region ids
 */
export const getBboxFromRegionIds = async (regionIds: string[]): Promise<BoundingBox | null> => {
  const key = regionIds.join('-');
  if (geoBBoxCache.has(key)) {
    return geoBBoxCache.get(key) || null;
  }

  const { data } = await API.post('gadm/spanning-bbox', { region_ids: regionIds });
  const { top_left: topLeft, bottom_right: bottomRight } = data;
  if (!topLeft || !bottomRight) return null;

  geoBBoxCache.set(key, [
    [topLeft.lon, topLeft.lat],
    [bottomRight.lon, bottomRight.lat],
  ]);

  return [
    [topLeft.lon, topLeft.lat],
    [bottomRight.lon, bottomRight.lat],
  ];
};

/**
 * Get bbox for each region id
 * @param regionIds region ids
 * @returns Array of bbox
 */
export const getBboxForEachRegionId = async (regionIds: string[]) => {
  const promises = regionIds.map((regionId) => getBboxFromRegionIds([regionId]));
  return Promise.all(promises);
};
