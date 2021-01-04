const cleanTextFragment = (text) => {
  return text
    // New lines
    .replace(/\n/g, ' ')
    // Space before commas
    .replace(/\s,/g, ',')
    // Space before periods
    .replace(/\s,/g, '.')
    // Multiple spaces
    .replace(/\s\s+/g, ' ')
    // Avoid issues with opening/closing missing parenthesis
    .replace(/[()]+/g, '');
};

const truncateString = (text, n) => {
  let truncated = text;
  if (text.length > n) {
    truncated = text.slice(0, n) + '...';
  }
  return truncated;
};

const containsInternalVowel = (text) => {
  return (/[A-Za-z][aeiou][A-Za-z]/i).test(text);
};

const dropOneInternalVowel = (text) => {
  return text.replace(/([A-Za-z])([aeiou])([A-Za-z])/i, '$1$3');
};

// Slightly smarter formatter to produce human-readable indicator values
const defaultValueFormatter = (v) => {
  if (v === 0) return 0;
  return v.toPrecision(3);
};
export const chartValueFormatter = (...range) => {
  if (!range || range.length === 0) {
    return defaultValueFormatter;
  }

  // Guard against skewed ranges. e.g. [0.103, 888888]
  if (range[0].toString().length < 7 && range[1].toString().length < 7) {
    return (v) => v;
  }
  return defaultValueFormatter;
};

const isValidUrl = (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === 'http:' || url.protocol === 'https:';
};

export default {
  cleanTextFragment,
  truncateString,
  containsInternalVowel,
  dropOneInternalVowel,
  chartValueFormatter,
  isValidUrl
};
