import StringUtil from '@/utils/string-util';

export default function(text = '', n) {
  return StringUtil.truncateString(text, n);
}
