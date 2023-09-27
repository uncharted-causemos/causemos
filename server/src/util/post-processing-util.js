const removeUnwantedData = (metadata) => {
  metadata.stochastic = undefined;
  metadata.attributes = undefined;
  metadata.image = undefined;
  metadata.storedRegions = undefined;
  metadata.deprecatesIDs = undefined;
  if (metadata.geography) {
    metadata.geography.coordinates = undefined;
  }
  if (metadata.outputs) {
    metadata.outputs.forEach((output) => {
      output.id = undefined;
    });
  }
  if (metadata.parameters) {
    metadata.parameters.forEach((param) => {
      param.id = undefined;
    });
    metadata.parameters.forEach((param) => {
      param.template = undefined;
    });
  }
};

const processFilteredData = (metadata) => {
  metadata.family_name = metadata.family_name || metadata.name;
  metadata.qualifier_outputs = metadata.qualifier_outputs || [];
};

module.exports = {
  processFilteredData,
  removeUnwantedData,
};
