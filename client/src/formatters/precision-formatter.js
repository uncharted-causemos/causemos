/**
 * Formats Indra score to human readable value
 */
export default function (value, precision) {
  precision = precision || 2;
  if (value == null) {
    // Guard against undefined values
    return value;
  } else {
    return value.toFixed(precision);
  }
}
