import moment from 'moment';

const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export default function (v, format) {
  if (!v) {
    return '';
  }
  return moment.utc(v).format(format || DATE_FORMAT);
}
