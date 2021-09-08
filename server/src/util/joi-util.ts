const fs = require('fs');
const Enjoi = require('enjoi');

function JsonValidationException(message) {
  this.message = message;
  this.name = 'JsonValidationException';
}

const readySchemas = new Map();
const filterWithSchema = (schemaFilename, json) => {
  if (!readySchemas.has(schemaFilename)) {
    const jsonSchema = JSON.parse(fs.readFileSync(schemaFilename));
    const schema = Enjoi.schema(jsonSchema);
    readySchemas.set(schemaFilename, schema);
  }
  const schema = readySchemas.get(schemaFilename);
  const validationResult = schema.validate(json, {
    stripUnknown: true
  });
  return { filteredJson: validationResult.value, error: validationResult.error };
}

const filterAndLog = (Logger, schemaFilename, metadata) => {
  Logger.info(`Start filtering and validation.`);
  const { filteredJson: filteredMetadata, error } = filterWithSchema(schemaFilename, metadata);
  if (error) {
    Logger.error('One of the required metadata fields was not provided.');
    throw new JsonValidationException(error);
  }
  return filteredMetadata;
}

module.exports = {
  filterWithSchema,
  filterAndLog
}
