import StringUtil from '@/utils/string-util';

export default function (text = '', n: number) {
  return StringUtil.truncateString(text, n);
}
