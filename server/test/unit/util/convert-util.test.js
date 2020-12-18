/* eslint-disable no-unused-expressions */
const expect = require('chai').expect;

const sampleIndra = require('../resources/sample_indra_20190724.json');
const convertedIndra = require('../resources/converted_indra_20190724.json');
const convertedEvidence = require('../resources/converted_evidence_20190724.json')
const convertUtil = require('../../../src/util/convert-util');

describe('convert-util', function () {
  describe('convertToIndra', function () {
    it('does not convert bad statements', function () {
      // check to see if we are passing in unknowns
      const invalidStatements = [{ subj: { concept: 'Unknown' },  obj: { concept: 'a' } }, { subj: { concept: 'b' },  obj: { concept: 'Unknown' } }];
      const convertedStatements = convertUtil.convertToIndra(invalidStatements);
      expect(convertedStatements).to.have.length(0);
    });
    it('converts statements to valid raw INDRA format', function () {
      const sampleStatements = [
        {
          id: '1',
          belief: 1,
          evidence: [{
            evidence_context: {
              agents_text: 'agents1',
              text: 'text1',
              source_api: 'reader1',
              source_hash: '1a',
              contradiction_words: [],
              hedging_words: ['abc']
            },
            document_context: {
              doc_id: 'doc1'
            }
          }, {
            evidence_context: {
              agents_text: 'agents2',
              text: 'text2',
              source_api: 'reader2',
              source_hash: '2a',
              contradiction_words: [],
              hedging_words: []
            },
            document_context: {
              doc_id: 'doc2'
            }
          }],
          subj: {
            factor: 'foo',
            concept: 'a/b/c/d',
            adjectives: ['very'],
            polarity: 0
          },
          obj: {
            factor: 'bar',
            concept: 'e/f/g/h',
            adjectives: [],
            polarity: -1
          }
        },
        {
          id: '1',
          belief: 1,
          subj: {
            factor: 'fee',
            concept: 'x/y/z',
            adjectives: ['very'],
            polarity: 0
          },
          obj: {
            factor: 'fi',
            concept: 'x/y/z',
            adjectives: ['much'],
            polarity: -1
          }
        }
      ]
      const expected = [
        {
          id: '1',
          type: 'Influence',
          belief: 1,
          evidence: [{
            text: 'text1',
            source_api: 'reader1',
            source_hash: '1a',
            annotations: {
              agents: {
                raw_text: 'agents1'
              },
              provenance: [
                {
                  document: { '@id': 'doc1' }
                }
              ],
              negated_texts: []
            },
            epistemics: {
              hedgings: ['abc']
            }
          }, {
            text: 'text2',
            source_api: 'reader2',
            source_hash: '2a',
            annotations: {
              agents: {
                raw_text: 'agents2'
              },
              provenance: [
                {
                  document: { '@id': 'doc2' }
                }
              ],
              negated_texts: []
            },
            epistemics: {
              hedgings: []
            }
          }],
          subj: {
            name: 'foo',
            db_refs: {
              TEXT: 'foo',
              concept: 'a/b/c/d'
            }
          },
          subj_delta: {
            adjectives: ['very'],
            polarity: 0
          },
          obj: {
            name: 'bar',
            db_refs: {
              TEXT: 'bar',
              concept: 'e/f/g/h'
            }
          },
          obj_delta: {
            adjectives: [],
            polarity: -1
          }
        },
        {
          id: '1',
          type: 'Influence',
          belief: 1,
          evidence: [],
          subj: {
            name: 'fee',
            db_refs: {
              TEXT: 'fee',
              concept: 'x/y/z'
            }
          },
          subj_delta: {
            adjectives: ['very'],
            polarity: 0
          },
          obj: {
            name: 'fi',
            db_refs: {
              TEXT: 'fi',
              concept: 'x/y/z'
            }
          },
          obj_delta: {
            adjectives: ['much'],
            polarity: -1
          }
        }
      ]
      expect(convertUtil.convertToIndra(sampleStatements)).to.deep.equal(expected);
    });
  });

  describe('convertFromIndra', function () {
    it('converts Indra to db format', function () {
      const toTest = convertUtil.convertFromIndras(sampleIndra);
      expect(toTest).to.have.length(2);
      const expected = convertedIndra;
      expect(toTest).to.deep.equal(expected);
    });
    it('does not convert bad Indra', function () {
      const invalidIndras = [{ 'type': 'influent', 'id': '123' }, { 'type': 'Influence' }];
      const result = convertUtil.convertFromIndra(invalidIndras);
      expect(result).to.be.empty;
    });
  });
  describe('processIndraEvidence', function () {
    it('process evidence to save to evidence collection', function () {
      const toTest = convertUtil.processEvidence(sampleIndra);
      expect(toTest).to.have.length(2);
      const expected = convertedEvidence;
      expect(toTest).to.deep.equal(expected);
    });
  });
});
