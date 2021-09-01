const processFilteredData = (filteredMetadata) => {
  // Apparently ES can't support negative timestamps
  if (filteredMetadata.period && filteredMetadata.period.gte < 0) {
    filteredMetadata.period.gte = 0;
  }
  if (filteredMetadata.period && filteredMetadata.period.lte < 0) {
    filteredMetadata.period.lte = 0;
  }
  filteredMetadata.family_name = filteredMetadata.family_name || filteredMetadata.name;
};

module.exports = {
  processFilteredData
};
