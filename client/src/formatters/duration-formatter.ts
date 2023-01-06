import moment from 'moment';

export default function (milliseconds: number | null, precise = true) {
  if (milliseconds === null || isNaN(milliseconds)) {
    return '';
  }

  if (!precise) {
    return moment.duration(milliseconds).humanize();
  }

  const sec = Math.round(milliseconds / 1000);
  const minutes = Math.floor(sec / 60);
  const hours = Math.floor(minutes / 60);

  return (
    (hours > 0 ? `${hours} hr, ` : '') +
    (minutes > 0 ? `${minutes % 60} min, ` : '') +
    `${sec % 60} sec`
  );
}
