const fs = require('fs');
const Enjoi = require('enjoi');

const filterWithSchema = (schemaFilename, json) => {
  const jsonSchema = JSON.parse(fs.readFileSync(schemaFilename));
  const schema = Enjoi.schema(jsonSchema);
  return schema.validate(json, {
    stripUnknown: true
  }).value;
}

module.exports = {
  filterWithSchema
}
