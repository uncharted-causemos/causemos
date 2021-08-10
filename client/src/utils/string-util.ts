import numberFormatter from '@/formatters/number-formatter';

const cleanTextFragment = (text: string) => {
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

const truncateString = (text: string, n: number) => {
  let truncated = text;
  if (text.length > n) {
    truncated = text.slice(0, n) + '...';
  }
  return truncated;
};

const containsInternalVowel = (text: string) => {
  return (/[A-Za-z][aeiou][A-Za-z]/i).test(text);
};

const dropOneInternalVowel = (text: string) => {
  return text.replace(/([A-Za-z])([aeiou])([A-Za-z])/i, '$1$3');
};

// Slightly smarter formatter to produce human-readable indicator values
const defaultValueFormatter = (v: number) => {
  if (v === 0) return '0';
  return v.toPrecision(3);
};
export const chartValueFormatter = (...range: number[]) => {
  if (!range || range.length === 0) {
    return defaultValueFormatter;
  }

  // Guard against skewed ranges. e.g. [0.103, 888888]
  if (Math.abs(range[0]) < 1000000 && Math.abs(range[1]) > 0.00001) {
    return (v: number) => {
      const preDecimalLength = v.toString().split('.')[0].length;
      const lengthCap = 5;
      let num = v;
      // given that we have display room for about 7 characters including
      // formatting like commas and decimals, change the truncation of data
      // such that we always maximize use of that space without adding 0s.
      if (preDecimalLength < 5) {
        num = +v.toFixed(lengthCap - preDecimalLength);
      } else {
        num = +v.toFixed(0);
      }

      // format truncated number with the usual number formatter
      return numberFormatter(num);
    };
  }
  return defaultValueFormatter;
};

const isValidUrl = (value: string) => {
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
