
/**
 * Calcuyed the bounding box of all input coordinates
 * @param coords an array of [x, y] coordinates
 * @returns bounding box in [[minX, maxY], [maxX, minY]]
 */
export function bbox(coords: [number, number][]) {
  const result = [[Infinity, -Infinity], [-Infinity, Infinity]]; // [[minX, maxY],[maxX, minY]]
  coords.forEach(([x, y]) => {
    if (result[0][0] > x) {
      result[0][0] = x;
    }
    if (result[0][1] < y) {
      result[0][1] = y;
    }
    if (result[1][0] < x) {
      result[1][0] = x;
    }
    if (result[1][1] > y) {
      result[1][1] = y;
    }
  });
  return result;
}

export default {
  bbox
};
