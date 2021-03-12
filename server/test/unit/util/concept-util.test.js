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
          }],
          fi: [{
            fie: [{
              name: 'x',
              definition: 'fo'
            }]
          }]
        }],
        b: [{
          fizz: [{
            buzz: [{
              fazz: [{
                name: 'z',
                definition: 'bass'
              }]
            }]
          }]
        }]
      };
    });
    it('flattens nested structure', function () {
      const flattened = {};
      conceptUtil.extractConceptDefinition(flattened, nestedMeta, '');
      const expected = {
        'a/foo/y': 'bar',
        'a/fi/fie': '',
        'a/fi/fie/x': 'fo',
        'b/fizz/buzz': '',
        'b/fizz/buzz/fazz': '',
        'b/fizz/buzz/fazz/z': 'bass'
      };
      expect(flattened).to.eql(expected);
    });
  });
});
