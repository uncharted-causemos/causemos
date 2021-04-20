import moment from 'moment';

const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export default function (v: Date | number, format = DATE_FORMAT) {
  if (v === undefined || v === null) {
    return '';
  }
  return moment.utc(v).format(format || DATE_FORMAT);
}
