import moment from 'moment';

export default function (milliseconds: number | null) {
  if (!milliseconds) {
    return '';
  }
  return moment.duration(milliseconds).humanize();
}
