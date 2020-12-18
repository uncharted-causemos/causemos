import _ from 'lodash';
import dateFormatter from '@/filters/date-formatter';

const constructDisplayString = (evidenceItem) => {
  const {
    author,
    publisher_name: publisherName,
    publication_date: publicationDate
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
  // Display date if provided
  // NOTE: Publication date month is 1-indexed, but date formatter expects it to be 0-indexed
  let cleanedPublicationDate;
  if (!_.isNil(publicationDate) && _.isNumber(publicationDate.month)) {
    cleanedPublicationDate = _.cloneDeep(publicationDate);
    cleanedPublicationDate.month--;
  }
  const date = dateFormatter(cleanedPublicationDate, 'MMM DD, YYYY');
  if (date.length === 0 || date === 'Invalid date') {
    return by;
  }
  if (by.length === 0) {
    return date;
  }
  return by + ' - ' + date;
};

export default {
  constructDisplayString
};
