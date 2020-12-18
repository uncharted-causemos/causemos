import moment from 'moment';

export default function (milliseconds) {
  if (!milliseconds) {
    return '';
  }
  return moment.duration(milliseconds).humanize();
}
