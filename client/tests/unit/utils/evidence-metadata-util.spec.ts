import _ from 'lodash';

import { EvidenceContext, DocumentContext } from '@/types/Statement';
import evidenceMetadataUtil from '@/utils/evidence-metadata-util';

const AUTHOR_NAME = 'Jane Doe';
const PUBLISHER_NAME = 'African Press Organization';
const PUBLICATION_DATE = {
  date: '2016-04-18',
  day: 18,
  month: 4,
  year: 2016,
};
const FORMATTED_PUBLICATION_DATE = 'Apr 18, 2016';

const document_context: DocumentContext = {
  doc_id: 'dummy',
  author: null,
  document_source: null,
  file_type: null,
  ner_analytics: {
    loc: [],
    org: [],
  },
  publication_date: null,
  publisher_name: null,
  title: null,
};
const evidence_context: EvidenceContext = {
  agents_text: [],
  contradiction_words: [],
  hedging_words: [],
  source_api: 'dummy',
  source_hash: 123,
  text: 'dummy',
};

const x = {
  document_context,
  evidence_context,
};

describe('evidence-metadata-util', () => {
  it('displays author name when it is available', () => {
    const EVIDENCE_ITEM = _.cloneDeep(x);
    EVIDENCE_ITEM.document_context.author = AUTHOR_NAME;
    expect(evidenceMetadataUtil.constructDisplayString(EVIDENCE_ITEM)).to.equal(AUTHOR_NAME);
  });

  it('displays publisher name when author is unavailable', () => {
    const EVIDENCE_ITEM = _.cloneDeep(x);
    EVIDENCE_ITEM.document_context.publisher_name = PUBLISHER_NAME;
    expect(evidenceMetadataUtil.constructDisplayString(EVIDENCE_ITEM)).to.equal(PUBLISHER_NAME);
  });

  it('displays date when available', () => {
    const EVIDENCE_ITEM = _.cloneDeep(x);
    EVIDENCE_ITEM.document_context.publication_date = PUBLICATION_DATE;
    expect(evidenceMetadataUtil.constructDisplayString(EVIDENCE_ITEM)).to.equal(
      FORMATTED_PUBLICATION_DATE
    );
  });

  it('displays author and date when available', () => {
    const EVIDENCE_ITEM = _.cloneDeep(x);
    EVIDENCE_ITEM.document_context.author = AUTHOR_NAME;
    EVIDENCE_ITEM.document_context.publication_date = PUBLICATION_DATE;
    expect(evidenceMetadataUtil.constructDisplayString(EVIDENCE_ITEM)).to.equal(
      AUTHOR_NAME + ' - ' + FORMATTED_PUBLICATION_DATE
    );
  });

  it('displays publisher and date when available', () => {
    const EVIDENCE_ITEM = _.cloneDeep(x);
    EVIDENCE_ITEM.document_context.publisher_name = PUBLISHER_NAME;
    EVIDENCE_ITEM.document_context.publication_date = PUBLICATION_DATE;
    expect(evidenceMetadataUtil.constructDisplayString(EVIDENCE_ITEM)).to.equal(
      PUBLISHER_NAME + ' - ' + FORMATTED_PUBLICATION_DATE
    );
  });
});
