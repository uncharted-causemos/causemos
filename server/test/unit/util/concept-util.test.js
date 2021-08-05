const expect = require('chai').expect;

const conceptUtil = require('../../../src/util/concept-util');

describe('concept-util', function () {
  describe('extractConceptExamples', function () {
    let nestedMeta = {};
    beforeEach(function() {
      nestedMeta = {
        a: [{
          foo: [{
            name: 'y',
            definition: 'bar'
          }]
        }],
        b: [{
          b_1: [{
            b_2: [{
              b_3: [{
                name: 'b_4',
                definition: 'bass',
                examples: ['hello', 'world']
              }]
            }]
          }]
        }]
      };
    });
    it('flattens nested structure', function () {
      const flattened = {};
      conceptUtil.extractConceptMetadata(flattened, nestedMeta, '');
      const expected = {
        'a/foo/y': { definition: 'bar', examples: [] },
        'b/b_1/b_2': { definition: '', examples: [] },
        'b/b_1/b_2/b_3': { definition: '', examples: [] },
        'b/b_1/b_2/b_3/b_4': { definition: 'bass', examples: ['hello', 'world'] }
      };
      expect(flattened).to.eql(expected);
    });
  });
});
