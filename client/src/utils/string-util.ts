import numberFormatter from '@/formatters/number-formatter';
import { RuntimeStage } from '@/types/Common';

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

// Anything absolute value more than 999 or less than 0.0001
// becomes an exponent, otherwise it's a string
export const exponentFormatter = (v: number) => {
  if (v === 0) return '0';
  return Math.abs(v) < 0.0001 || Math.abs(v) > 999 ? v.toExponential(2) : rangedFormatter(v);
};

const rangedFormatter = (v: number) => {
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

export const chartValueFormatter = (...range: number[]) => {
  if (!range || range.length === 0) {
    return defaultValueFormatter;
  }

  // Guard against skewed ranges. e.g. [0.103, 888888]
  if (Math.abs(range[1]) > 0.00001 && Math.abs(range[1]) < 1000000 && (range[0] === 0 || Math.abs(range[0]) > 0.00001)) {
    return rangedFormatter;
  }
  return exponentFormatter;
};

export const capitalize = (str: string) => {
  return str.charAt(0).toLocaleUpperCase() + str.slice(1);
};

export const runtimeFormatter = (runtime: RuntimeStage) => {
  if (!runtime || !runtime.start_time || !runtime.end_time || runtime.start_time > runtime.end_time) {
    return 'unknown';
  }

  const hhmmss = new Date(runtime.end_time - runtime.start_time).toISOString().substr(11, 8);
  const trimmed00 = hhmmss.startsWith('00') ? hhmmss.substr(3) : hhmmss;
  return trimmed00.startsWith('0') ? trimmed00.substr(1) : trimmed00;
};

export const timeDurationFormatter = (seconds: number) => {
  if (isNaN(seconds)) {
    return '';
  }

  const sec = Math.round(seconds);
  const minutes = Math.floor(sec / 60);
  const hours = Math.floor(minutes / 60);

  return (hours > 0 ? `${hours} hr, ` : '') +
    (minutes > 0 ? `${minutes % 60} min, ` : '') +
    `${sec % 60} sec`;
};

export const isValidUrl = (value: string) => {
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
  exponentFormatter,
  capitalize,
  runtimeFormatter,
  isValidUrl
};
