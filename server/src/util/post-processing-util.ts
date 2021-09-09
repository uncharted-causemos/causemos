const removeUnwantedData = (metadata) => {
  metadata.stochastic = undefined;
  metadata.attributes = undefined;
  metadata.image = undefined;
  if (metadata.geography) {
    metadata.geography.coordinates = undefined;
  }
  if (metadata.outputs) {
    metadata.outputs.forEach(output => { output.id = undefined; });
  }
  if (metadata.parameters) {
    metadata.parameters.forEach(param => { param.id = undefined; });
  }
}

const processFilteredData = (metadata) => {
  // Apparently ES can't support negative timestamps
  if (metadata.period && metadata.period.gte < 0) {
    metadata.period.gte = 0;
  }
  if (metadata.period && metadata.period.lte < 0) {
    metadata.period.lte = 0;
  }
  metadata.family_name = metadata.family_name || metadata.name;
};

module.exports = {
  processFilteredData,
  removeUnwantedData
};
