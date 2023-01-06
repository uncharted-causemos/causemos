import _ from 'lodash';

/**
 * Formats geoJSON data into list of location names
 */
export default function (locations: { [key: string]: string }[]) {
  if (_.isEmpty(locations)) return 'n/a';
  const locationNames = locations.map((l) => l.name);
  return locationNames.join(', ');
}
