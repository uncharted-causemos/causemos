import {
  getRandomInt,
  getRandomLoremIpsumWord,
  getRandomBoolean,
  getArrayOfRandomLength,
  getRandomValueFromArray
} from './random';

const ONTOLOGY = [
  'Unknown',
  'UN/entities/GPE',
  'UN/entities/food_availability',
  'UN/entities/human/education',
  'UN/entities/human/government/government_actions/regulation',
  'UN/events/nature_impact/pollution/climate_change',
  'UN/events/nature_impact/pollution/land_pollution',
  'UN/events/nature_impact/resource_management',
  'UN/events/weather/climate',
  'UN/events/weather/precipitation',
  'UN/interventions/provision_of_goods_and_services/health/provision_of_newborn_and_childhood_essential_health_care_services',
  'UN/interventions/provision_of_goods_and_services/protection/provision_of_human_rights_monitoring_investigation_and_reporting',
  'UN/interventions/provision_of_goods_and_services/protection/provision_of_temporary_policing_services',
  'UN/temporal/seasons/crop_season'
];

export function getRandomEdge(values = {}) {
  if (values.source == null) {
    values.source = getRandomLoremIpsumWord();
  }

  if (values.target == null) {
    values.target = getRandomLoremIpsumWord();
  }

  if (values.unknown == null) {
    values.unknown = getRandomInt(0, 50);
  }

  if (values.same == null) {
    values.same = getRandomInt(0, 50);
  }

  if (values.opposite == null) {
    values.opposite = getRandomInt(0, 50);
  }

  if (values.count == null) {
    values.count = values.unknown + values.same + values.opposite;
  }
  return values;
}

export function getRandomNode(values = {}) {
  if (values.id == null) {
    values.id = getRandomLoremIpsumWord();
  }

  if (values.count == null) {
    values.count = getRandomInt(1, 50);
  }

  if (values.label == null) {
    values.label = `${values.id} (${values.count})`;
  }

  if (values.leaf == null) {
    values.leaf = getRandomBoolean();
  }

  if (values.parent == null && values.leaf === true) {
    values.parent = getRandomLoremIpsumWord();
  }

  return { id: values.id, data: values };
}

export function getRandomNodeList() {
  const hierarchyDepth = getRandomInt(1, 7);
  const nodeIdHierarchy = [];
  const nodes = [];
  let currentIndex = hierarchyDepth;

  for (; currentIndex > 0; currentIndex--) {
    nodeIdHierarchy[currentIndex] = getArrayOfRandomLength(1, 20, getRandomLoremIpsumWord);
  }

  for (currentIndex = hierarchyDepth; currentIndex > 1; currentIndex--) {
    nodeIdHierarchy[currentIndex].forEach(id => {
      nodes.push(getRandomNode({
        id,
        parent: getRandomValueFromArray(nodeIdHierarchy[currentIndex - 1]),
        leaf: currentIndex === hierarchyDepth
      }));
    });
  }
  return nodes;
}

export function getRandomEdgeList(nodeIds = []) {
  const ids = nodeIds || getArrayOfRandomLength(5, 15, getRandomLoremIpsumWord);

  return getArrayOfRandomLength(5, 15, () => {
    return getRandomEdge({
      source: getRandomValueFromArray(ids),
      target: getRandomValueFromArray(ids)
    });
  });
}

export function getRandomGraph() {
  const nodes = getRandomNodeList();
  const nodeIds = nodes.map(node => node.id);
  const edges = getRandomEdgeList(nodeIds);

  return { nodes, edges };
}

export function getOntologyGraph() {
  const hierarchyDepth = Math.max(...ONTOLOGY.map(id => id.split('/').length));
  const nodes = ONTOLOGY.map(id => {
    const depth = id.split('/').length;
    return getRandomNode({ id, leaf: depth === hierarchyDepth });
  });
  const groundedNodes = nodes.filter(node => node.data.count);
  const edges = getRandomEdgeList(groundedNodes.map(node => node.data.id));

  return { nodes, edges };
}
