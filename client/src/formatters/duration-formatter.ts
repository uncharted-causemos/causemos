import moment from 'moment';

export default function (milliseconds: number) {
  if (!milliseconds) {
    return '';
  }
  return moment.duration(milliseconds).humanize();
}
