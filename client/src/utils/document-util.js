import _ from 'lodash';
import dateFormatter from '@/formatters/date-formatter';

export const DOC_FIELD = Object.freeze({
  AUTHOR: 'author',
  CATEGORY: 'category',
  DOC_ID: 'id',
  DOC_TITLE: 'doc_title',
  FILE_NAME: 'file_name',
  FILE_TYPE: 'file_type', // require
  DOC_RAW_TEXT: 'doc_raw_text',
  EXTRACTED_TEXT: 'extracted_text',
  PUBLICATION_DATE: 'publication_date',
  PUBLISHER_NAME: 'publisher_name',
  SOURCE_URL: 'source_url', // require,
  RATING: 'rating',
  STORED_URL: 'stored_url', // require,
  SOURCE_DOMAIN: 'source_domain'
});

/* Not in use, July 2020
export const DOC_RAW_TEXT_FIELD = Object.freeze({
  TIMESTAMP: 'timestamp',
  EXTRACTION_TOOL: 'extraction_tool'
});
*/


export function toDocument(rawDocument) {
  const document = {
    author: rawDocument[DOC_FIELD.AUTHOR],
    category: rawDocument[DOC_FIELD.CATEGORY],
    docId: rawDocument[DOC_FIELD.DOC_ID],
    docTitle: rawDocument[DOC_FIELD.DOC_TITLE],
    fileName: rawDocument[DOC_FIELD.FILE_NAME],
    fileType: rawDocument[DOC_FIELD.FILE_TYPE], // require
    docRawText: {
      // timestamp: rawDocument[DOC_FIELD.DOC_RAW_TEXT][DOC_RAW_TEXT_FIELD.TIMESTAMP],
      // extractionTool: rawDocument[DOC_FIELD.DOC_RAW_TEXT][DOC_RAW_TEXT_FIELD.EXTRACTION_TOOL],
      extractedText: rawDocument[DOC_FIELD.EXTRACTED_TEXT]
    },
    publicationDate: rawDocument[DOC_FIELD.PUBLICATION_DATE],
    publisherName: rawDocument[DOC_FIELD.PUBLISHER_NAME],
    sourceUrl: rawDocument[DOC_FIELD.SOURCE_URL], // require,
    rating: rawDocument[DOC_FIELD.RATING],
    storedUrl: rawDocument[DOC_FIELD.RATING], // require,
    sourceDomain: rawDocument[DOC_FIELD.SOURCE_DOMAIN]
  };

  return document;
}

export function toCardData(document, isRaw = true) {
  const doc = isRaw ? toDocument(document) : document;
  const {
    author,
    category,
    docId,
    fileType,
    docTitle,
    docRawText,
    publicationDate,
    sourceDomain,
    sourceUrl
  } = doc;
  const pubDate = _.isEmpty(publicationDate)
    ? ''
    : dateFormatter(new Date(Date.UTC(publicationDate.year, publicationDate.month - 1, publicationDate.day)), 'MMM DD, YYYY');

  return {
    id: docId,
    topBarColor: undefined,
    imageUrl: [],
    source: sourceDomain,
    sourceUrl: sourceUrl,
    sourceImage: '',
    title: docTitle,
    subtitle: [
      author,
      pubDate
    ],
    summary: '',
    content: docRawText ? docRawText.extractedText : '',
    metadata: {
      'Publication': pubDate,
      'Source': sourceUrl,
      'Category': category,
      'File type': fileType
    }
  };
}

export function toCardsData(document = [], isRaw = true) {
  return document.map(d => toCardData(d, isRaw));
}
