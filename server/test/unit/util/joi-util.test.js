const expect = require('chai').expect;
const Joi = require('joi');
const Enjoi = require('enjoi');
const fs = require('fs');

describe('joi-util', function () {
  describe('Filter examples', function () {
    it('Test a basic filter with a schema defined in code.', function() {
      const val = {
        a: 'test-val-a',
        b: 'test-val-b'
      };
      const schema = Joi.object({
        a: Joi.string()
      });
      const result = schema.validate(val, {
        stripUnknown: true
      });
      expect(result.value).to.eql({ a: 'test-val-a' });
    });
    it('Test a basic filter with a schema from a file.', function() {
      const val = {
        a: 'test-val-a',
        b: 'test-val-b'
      };
      const jsonSchema = JSON.parse(fs.readFileSync('./test/unit/util/sample-schema.json'));
      const schema = Enjoi.schema(jsonSchema);
      const result = schema.validate(val, {
        stripUnknown: true
      });
      expect(result.value).to.eql({ a: 'test-val-a' });
    });
  });
});
