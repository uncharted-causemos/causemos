/**
 * Calculate the bounding box of all input coordinates
 * @param coords an array of [x, y] coordinates
 * @returns bounding box in [[minX, maxY], [maxX, minY]]
 */
export function bbox(coords: [number, number][]) {
  const result: [[number, number], [number, number]] = [
    [Infinity, -Infinity],
    [-Infinity, Infinity],
  ]; // [[minX, maxY],[maxX, minY]]
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

/**
 * Return a new bounding box expanded by given margin
 * @param bbox bounding box in the form of [[minX, maxY], [maxX, minY]]
 * @param margin A margin to be add on all side of the bounding box.
 * @returns A new bounding box with add margin
 */
export function expand(bbox: [[number, number], [number, number]], margin = 1) {
  return [
    [bbox[0][0] - margin, bbox[0][1] + margin],
    [bbox[1][0] + margin, bbox[0][1] - margin],
  ];
}

export default {
  bbox,
  expand,
};
