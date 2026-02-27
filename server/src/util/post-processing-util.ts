export const removeUnwantedData = (metadata: any): void => {
  metadata.stochastic = undefined;
  metadata.attributes = undefined;
  metadata.image = undefined;
  metadata.storedRegions = undefined;
  metadata.deprecatesIDs = undefined;
  if (metadata.geography) {
    metadata.geography.coordinates = undefined;
  }
  if (metadata.outputs) {
    metadata.outputs.forEach((output: any) => {
      output.id = undefined;
    });
  }
  if (metadata.parameters) {
    metadata.parameters.forEach((param: any) => {
      param.id = undefined;
    });
    metadata.parameters.forEach((param: any) => {
      param.template = undefined;
    });
  }
};

export const processFilteredData = (metadata: any): void => {
  metadata.family_name = metadata.family_name || metadata.name;
  metadata.qualifier_outputs = metadata.qualifier_outputs || [];
};
