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
            examples: 'bar'
          }],
          fi: [{
            fie: [{
              name: 'x',
              examples: 'fo'
            }]
          }]
        }],
        b: [{
          fizz: [{
            buzz: [{
              fazz: [{
                name: 'z',
                examples: 'bass'
              }]
            }]
          }]
        }]
      }
    });
    it('flattens nested structure', function () {
      const flattened = {}
      conceptUtil.extractConceptExamples(flattened, nestedMeta, '');
      const expected = {
        'a/foo/y': 'bar',
        'a/fi/fie': [],
        'a/fi/fie/x': 'fo',
        'b/fizz/buzz': [],
        'b/fizz/buzz/fazz': [],
        'b/fizz/buzz/fazz/z': 'bass'
      }
      expect(flattened).to.eql(expected);
    });
  });
});
