import API from '@/api/api';

/**
 * Fetch bounding box of the regions of provided region ids
 * @param regionIds region ids
 */
export const getBboxFromRegionIds = async (regionIds: string[]) => {
  const { data } = await API.post('gadm/spanning-bbox', { region_ids: regionIds });
  const { top_left: topLeft, bottom_right: bottomRight } = data;
  if (!topLeft && !bottomRight) return null;
  return [[topLeft.lon, topLeft.lat], [bottomRight.lon, bottomRight.lat]];
};
