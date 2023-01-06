import _ from 'lodash';
import dateFormatter from '@/formatters/date-formatter';
import { Evidence } from '@/types/Statement';

const constructDisplayString = (evidenceItem: Evidence) => {
  const {
    author,
    publisher_name: publisherName,
    publication_date: publicationDate,
  } = evidenceItem.document_context;
  // Display author name if provided,
  //  otherwise fallback to publisher name
  //  otherwise neither
  let by = '';
  if (!_.isNil(author) && author.length > 0) {
    by = author;
  } else if (!_.isNil(publisherName) && publisherName.length > 0) {
    by = publisherName;
  }

  if (!publicationDate) {
    return by;
  }

  // Display date if provided
  const date = dateFormatter(publicationDate.date, 'MMM DD, YYYY');
  if (date.length === 0 || date === 'Invalid date') {
    return by;
  }
  if (by.length === 0) {
    return date;
  }
  return by + ' - ' + date;
};

export default {
  constructDisplayString,
};
