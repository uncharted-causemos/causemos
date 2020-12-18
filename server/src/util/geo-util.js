const turf = require('@turf/turf');

// Takes bounding box and returns area in square meters
const getBoundingBoxArea = ({
  top,
  left,
  bottom,
  right
}) => {
  const bbox = turf.polygon([
    [
      [left, bottom],
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom]
    ]
  ]);
  const area = turf.area(bbox);
  return area;
};

// Bounds derived from open street maps: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Mathematics
const geoBoundsFromTile = (z, x, y) => {
  const bounds = {
    top: tile2lat(y, z),
    bottom: tile2lat(y + 1, z),
    left: tile2long(x, z),
    right: tile2long(x + 1, z)
  };
  return bounds;
};

const tile2long = (x, z) => {
  // Returns the westmost longitude of a tile
  return ((x / Math.pow(2, z)) * 360 - 180);
};

const tile2lat = (y, z) => {
  // Returns the northmost latitude of a tile
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
  return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
};

module.exports = {
  getBoundingBoxArea,
  geoBoundsFromTile
};
