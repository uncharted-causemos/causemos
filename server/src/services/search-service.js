const { searchAndHighlight, queryStringBuilder } = require('#@/adapters/es/client.js');
const { RESOURCE } = require('#@/adapters/es/adapter.js');

const formatDatacubeDoc = (d) => {
  const defaultFeature = d.outputs.find((output) => output.name === d.default_feature);
  const res = defaultFeature.data_resolution
    ? defaultFeature.data_resolution.temporal_resolution
    : undefined;

  return {
    id: d.id,
    data_id: d.data_id,
    name: d.name,
    family_name: d.family_name,
    category: d.category,
    period: d.period,
    type: d.type,

    feature: defaultFeature.name,
    display_name: defaultFeature.display_name,
    description: defaultFeature.description,
    raw_temporal_resolution: res,
  };
};

// TODO: Move Datacube search functions to datacube-service.js
const rawDatacubeSearch = async (queryString) => {
  const filters = [];
  const reserved = ['or', 'and'];
  const builder = queryStringBuilder().setOperator('OR').setFields(['outputs.description']);

  queryString
    .split(' ')
    .filter((s) => {
      return !reserved.includes(s.toLowerCase());
    })
    .forEach((v) => builder.addWildCard(v));

  const results = await searchAndHighlight(RESOURCE.DATA_DATACUBE, builder.build(), filters, []);

  return results.map((d) => {
    return {
      doc_type: 'data_cube',
      score: d._score,
      doc: formatDatacubeDoc(d._source),
      highlight: d.highlight,
    };
  });
};

module.exports = {
  rawDatacubeSearch,
};
