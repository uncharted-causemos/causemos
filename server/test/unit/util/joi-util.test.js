const expect = require('chai').expect;
const should = require('chai').should();
const Joi = require('joi');
const Enjoi = require('enjoi');
const fs = require('fs');
const { filterWithSchema } = rootRequire('util/joi-util.ts');

describe('joi-util', function () {
  describe('Filter examples', function () {
    it('Test a basic filter with a schema defined in code.', function() {
      const json = {
        a: 'test-val-a',
        b: 'test-val-b'
      };
      const schema = Joi.object({
        a: Joi.string()
      });
      const result = schema.validate(json, {
        stripUnknown: true
      });
      expect(result.value).to.eql({ a: 'test-val-a' });
    });
    it('Test a basic filter with a schema from a file.', function() {
      const json = {
        a: 'test-val-a',
        b: 'test-val-b'
      };
      const jsonSchema = JSON.parse(fs.readFileSync('./test/unit/util/filter-schema.json'));
      const schema = Enjoi.schema(jsonSchema);
      const result = schema.validate(json, {
        stripUnknown: true
      });
      expect(result.value).to.eql({ a: 'test-val-a' });
    });
    it('Use a schema file and the util function.', function() {
      const json = {
        a: 'test-val-a',
        b: 'test-val-b'
      };
      const result = filterWithSchema('./test/unit/util/filter-schema.json', json);
      expect(result).to.eql({ a: 'test-val-a' });
    });
  });
  describe('Validation examples', function () {
    it('A simple validation that succeeds.', function() {
      const json = {
        a: 'test-val-a'
      };
      const jsonSchema = JSON.parse(fs.readFileSync('./test/unit/util/validation-schema.json'));
      const schema = Enjoi.schema(jsonSchema);
      const { error } = schema.validate(json, {
        stripUnknown: true
      });
      should.not.exist(error);
    });
    it('A simple validation that fails.', function() {
      const json = {};
      const jsonSchema = JSON.parse(fs.readFileSync('./test/unit/util/validation-schema.json'));
      const schema = Enjoi.schema(jsonSchema);
      const { error } = schema.validate(json, {
        stripUnknown: true
      });
      should.exist(error);
    });
  });
});
