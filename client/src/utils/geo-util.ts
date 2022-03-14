
/**
 * Calculated the bounding box of all input coordinates
 * @param coords an array of [x, y] coordinates
 * @returns bounding box in [[minX, maxY], [maxX, minY]]
 */
export function bbox(coords: [number, number][]) {
  const result = [[Infinity, -Infinity], [-Infinity, Infinity]]; // [[minX, maxY],[maxX, minY]]
  coords.forEach(([lng, lat]) => {
    if (result[0][0] > lng) {
      result[0][0] = lng;
    }
    if (result[0][1] < lat) {
      result[0][1] = lat;
    }
    if (result[1][0] < lng) {
      result[1][0] = lng;
    }
    if (result[1][1] > lat) {
      result[1][1] = lat;
    }
  });
  return result;
}

export default {
  bbox
};
