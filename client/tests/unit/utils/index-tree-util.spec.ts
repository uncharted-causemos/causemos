import { expect } from 'chai';
import {
  findNode,
  findAndRemoveChild,
  findAndUpdateNode,
  duplicateNode,
  createNewOutputIndex,
  indexNodeTreeContainsDataset,
  rebalanceInputWeights,
  findAllDatasets,
  calculateOverallWeight,
  isConceptNodeWithoutDataset,
  isConceptNodeWithDatasetAttached,
  createNewConceptNode,
  countOppositeEdgesBetweenNodes,
  addChild,
} from '@/utils/index-tree-util';
import { AggregationOption, ProjectionAlgorithm, TemporalResolutionOption } from '@/types/Enums';
import { ConceptNodeWithoutDataset } from '@/types/Index';
import { WeightedComponent } from '@/types/WeightedComponent';

export const newTestTree = (): ConceptNodeWithoutDataset => ({
  id: '6e4adcee-c3af-4696-b84c-ee1169adcd4c',
  name: 'Overall Priority',
  isOutputNode: true,
  components: [
    {
      componentNode: {
        id: '5ad78cb0-b923-48ef-9c1a-31219987ca16',
        name: 'Highest risk of drought',
        isOutputNode: false,
        components: [
          {
            isOppositePolarity: false,
            isWeightUserSpecified: false,
            weight: 0,
            componentNode: {
              id: 'a547b59f-9287-4991-a817-08ba54a0353f',
              name: 'Greatest reliance on fragile crops',
              isOutputNode: false,
              components: [],
            },
          },
        ],
      },
      isOppositePolarity: false,
      isWeightUserSpecified: true,
      weight: 20,
    },
    {
      componentNode: {
        id: '6db6284d-7879-4735-a460-5f2b273c0bf9',
        // type: IndexNodeType.Index,
        name: 'Largest vulnerable population',
        isOutputNode: false,
        components: [
          {
            isOppositePolarity: false,
            isWeightUserSpecified: true,
            weight: 80,
            componentNode: {
              id: '16caf563-548f-4e11-a488-a900f0d01c3b',
              name: 'Highest poverty index ranking',
              isOutputNode: false,
              dataset: {
                datasetName: 'Poverty indicator index',
                config: {
                  datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
                  selectedTimestamp: 0,
                  outputVariable: 'test',
                  runId: 'indicators',
                  temporalResolution: TemporalResolutionOption.Month,
                  temporalAggregation: AggregationOption.Mean,
                  spatialAggregation: AggregationOption.Mean,
                },
                isInverted: false,
                projectionAlgorithm: ProjectionAlgorithm.Auto,
                source: 'UN',
              },
            },
          },
          {
            isOppositePolarity: false,
            isWeightUserSpecified: true,
            weight: 0,
            componentNode: {
              id: '2f624d92-efa0-431a-a3a1-5521871420ad',
              name: 'Population Health',
              isOutputNode: false,
              components: [
                {
                  isOppositePolarity: false,
                  isWeightUserSpecified: true,
                  weight: 80,
                  componentNode: {
                    id: 'd851ac5d-2de2-475d-8ef7-5bd46a1a9016',
                    name: 'Malnutrition',
                    isOutputNode: false,
                    dataset: {
                      datasetName: 'Malnutrition rates dataset',
                      source: 'UN',
                      isInverted: false,
                      projectionAlgorithm: ProjectionAlgorithm.Auto,
                      config: {
                        datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
                        selectedTimestamp: 0,
                        outputVariable: 'test',
                        runId: 'indicators',
                        temporalResolution: TemporalResolutionOption.Month,
                        temporalAggregation: AggregationOption.Mean,
                        spatialAggregation: AggregationOption.Mean,
                      },
                    },
                  },
                },
                {
                  isOppositePolarity: false,
                  isWeightUserSpecified: true,
                  weight: 20,
                  componentNode: {
                    id: 'ac56ea0f-3ca9-4aee-9c06-f98768b7bd2a',
                    name: 'Life expectancy by country',
                    isOutputNode: false,
                    dataset: {
                      datasetName: 'Life expectancy by country',
                      source: 'UN',
                      isInverted: false,
                      projectionAlgorithm: ProjectionAlgorithm.Auto,
                      config: {
                        datasetId: 'dd7f69937-060d-44e8-8a04-22070ce35b27',
                        selectedTimestamp: 0,
                        outputVariable: 'test',
                        runId: 'indicators',
                        temporalResolution: TemporalResolutionOption.Month,
                        temporalAggregation: AggregationOption.Mean,
                        spatialAggregation: AggregationOption.Mean,
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
      isOppositePolarity: false,
      isWeightUserSpecified: true,
      weight: 60,
    },
  ],
});

const weightedDatasetComponent: WeightedComponent = {
  isOppositePolarity: false,
  isWeightUserSpecified: false,
  weight: 0,
  componentNode: {
    id: '16caf563-548f-4e11-a488-a900f0d01c3b',
    name: 'Highest poverty index ranking',
    isOutputNode: false,
    dataset: {
      datasetName: 'Poverty indicator index',
      config: {
        datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
        selectedTimestamp: 0,
        outputVariable: 'test',
        runId: 'indicators',
        temporalResolution: TemporalResolutionOption.Month,
        temporalAggregation: AggregationOption.Mean,
        spatialAggregation: AggregationOption.Mean,
      },
      isInverted: false,
      projectionAlgorithm: ProjectionAlgorithm.Auto,
      source: 'UN',
    },
  },
};
const emptyWeightedComponent = {
  isOppositePolarity: false,
  isWeightUserSpecified: false,
  weight: 80,
  componentNode: createNewConceptNode(),
};

describe('index-tree-util', () => {
  describe('findNode', () => {
    it('should find a root node', () => {
      const tree = newTestTree();
      const result = findNode(tree, '6e4adcee-c3af-4696-b84c-ee1169adcd4c');

      expect(result?.parent).equal(null);

      expect(result?.found.id).equal('6e4adcee-c3af-4696-b84c-ee1169adcd4c');
      expect(result?.found.isOutputNode).equal(true);
      expect(result?.found.name).equal('Overall Priority');
    });
    it('should find a node from direct children', () => {
      const tree = newTestTree();
      const result = findNode(tree, '6db6284d-7879-4735-a460-5f2b273c0bf9');

      expect(result?.parent?.id).equal('6e4adcee-c3af-4696-b84c-ee1169adcd4c');

      expect(result?.found.id).equal('6db6284d-7879-4735-a460-5f2b273c0bf9');
      expect(result?.found && isConceptNodeWithoutDataset(result.found)).equal(true);
      expect(result?.found.name).equal('Largest vulnerable population');
    });
    it('should find a node from leaf nodes', () => {
      const tree = newTestTree();
      const result = findNode(tree, 'ac56ea0f-3ca9-4aee-9c06-f98768b7bd2a');

      expect(result?.parent?.id).equal('2f624d92-efa0-431a-a3a1-5521871420ad');

      expect(result?.found.id).equal('ac56ea0f-3ca9-4aee-9c06-f98768b7bd2a');
      expect(result?.found && isConceptNodeWithDatasetAttached(result.found)).equal(true);
      expect(result?.found.name).equal('Life expectancy by country');
    });
    it('should return undefined when node not found', () => {
      const tree = newTestTree();
      const result = findNode(tree, 'wrong-id-6e4adcee-c3af-4696-b84c-ee1169adcd4c');

      expect(result).equal(undefined);
    });
  });
  describe('findAndUpdateNode', () => {
    it('should update root node', () => {
      const tree = newTestTree();
      const update: ConceptNodeWithoutDataset = {
        isOutputNode: true,
        id: '6e4adcee-c3af-4696-b84c-ee1169adcd4c',
        name: 'Updated node',
        components: [],
      };
      const isUpdated = findAndUpdateNode(tree, update);

      expect(isUpdated).equal(true);
      expect(tree).deep.equal({
        isOutputNode: true,
        id: '6e4adcee-c3af-4696-b84c-ee1169adcd4c',
        name: 'Updated node',
        components: [],
      });
    });
    it('should update a node', () => {
      const tree = newTestTree();
      const update: ConceptNodeWithoutDataset = {
        id: '6db6284d-7879-4735-a460-5f2b273c0bf9',
        name: 'Largest vulnerable population',
        isOutputNode: false,
        components: [
          {
            weight: 0,
            isWeightUserSpecified: false,
            isOppositePolarity: false,
            componentNode: {
              id: '16caf563-548f-4e11-a488-a900f0d01c3b',
              name: 'Updated Placeholder',
              isOutputNode: false,
              components: [],
            },
          },
        ],
      };
      const isUpdated = findAndUpdateNode(tree, update);

      expect(isUpdated).equal(true);
      expect(tree).deep.equal({
        id: '6e4adcee-c3af-4696-b84c-ee1169adcd4c',
        name: 'Overall Priority',
        isOutputNode: true,
        components: [
          {
            componentNode: {
              id: '5ad78cb0-b923-48ef-9c1a-31219987ca16',
              name: 'Highest risk of drought',
              isOutputNode: false,
              components: [
                {
                  isOppositePolarity: false,
                  isWeightUserSpecified: false,
                  weight: 0,
                  componentNode: {
                    id: 'a547b59f-9287-4991-a817-08ba54a0353f',
                    name: 'Greatest reliance on fragile crops',
                    isOutputNode: false,
                    components: [],
                  },
                },
              ],
            },
            isOppositePolarity: false,
            isWeightUserSpecified: true,
            weight: 20,
          },
          {
            isOppositePolarity: false,
            isWeightUserSpecified: true,
            weight: 60,
            componentNode: update,
          },
        ],
      });
    });
    it('should return false if node to be updated is not found', () => {
      const tree = newTestTree();
      const isUpdated = findAndUpdateNode(tree, {
        id: 'not-found-id',
        name: 'Greatest reliance on fragile crops',
        components: [],
        isOutputNode: false,
      });
      expect(isUpdated).deep.equal(false);
    });
  });
  describe('findAndRemoveChild', () => {
    it('should find and remove a node', () => {
      const tree = newTestTree();
      const isRemoved = findAndRemoveChild(tree, '6db6284d-7879-4735-a460-5f2b273c0bf9');

      expect(isRemoved);
      expect(tree).deep.equal({
        id: '6e4adcee-c3af-4696-b84c-ee1169adcd4c',
        name: 'Overall Priority',
        isOutputNode: true,
        components: [
          {
            componentNode: {
              id: '5ad78cb0-b923-48ef-9c1a-31219987ca16',
              name: 'Highest risk of drought',
              isOutputNode: false,
              components: [
                {
                  isOppositePolarity: false,
                  isWeightUserSpecified: false,
                  weight: 0,
                  componentNode: {
                    id: 'a547b59f-9287-4991-a817-08ba54a0353f',
                    name: 'Greatest reliance on fragile crops',
                    isOutputNode: false,
                    components: [],
                  },
                },
              ],
            },
            isOppositePolarity: false,
            isWeightUserSpecified: true,
            weight: 20,
          },
        ],
      });
    });
    it('should return false if node to be deleted is not found', () => {
      const tree = newTestTree();
      // try remove with root node id
      let isRemoved = findAndRemoveChild(tree, tree.id);
      expect(isRemoved).equal(false);

      isRemoved = findAndRemoveChild(tree, 'non-existent-id');
      expect(isRemoved).equal(false);
    });
  });

  describe('duplicateNode', () => {
    it('should deep copy the node', () => {
      const tree = newTestTree();
      const duplicated = duplicateNode(tree);

      // check root
      expect(tree.id).not.equal(duplicated.id);
      expect(tree.name).equal(duplicated.name);

      // check grandchild
      const node = (
        (tree as ConceptNodeWithoutDataset).components[1].componentNode as ConceptNodeWithoutDataset
      ).components[0].componentNode;
      const dNode = (
        (duplicated as ConceptNodeWithoutDataset).components[1]
          .componentNode as ConceptNodeWithoutDataset
      ).components[0].componentNode;

      expect(node.id).not.equal(dNode.id);
      expect(node.name).equal(dNode.name);
    });
  });

  describe('indexNodeTreeContainsDataset', () => {
    it('should return false for a tree with one node that is an output index', () => {
      const tree = createNewOutputIndex();
      const containsDataset = indexNodeTreeContainsDataset(tree);
      expect(containsDataset).to.equal(false);
    });
    it('should return true for a tree with a height of 1 that includes a dataset', () => {
      const tree: ConceptNodeWithoutDataset = {
        id: '6e4adcee-c3af-4696-b84c-ee1169adcd4c',
        name: 'Overall Priority',
        isOutputNode: true,
        components: [
          {
            isOppositePolarity: false,
            isWeightUserSpecified: true,
            weight: 100,
            componentNode: {
              id: '16caf563-548f-4e11-a488-a900f0d01c3b',
              name: 'Highest poverty index ranking',
              isOutputNode: false,
              dataset: {
                datasetName: 'Poverty indicator index',
                config: {
                  datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
                  selectedTimestamp: 0,
                  outputVariable: 'test',
                  runId: 'indicators',
                  temporalResolution: TemporalResolutionOption.Month,
                  temporalAggregation: AggregationOption.Mean,
                  spatialAggregation: AggregationOption.Mean,
                },
                isInverted: false,
                projectionAlgorithm: ProjectionAlgorithm.Auto,
                source: 'UN',
              },
            },
          },
        ],
      };
      const containsDataset = indexNodeTreeContainsDataset(tree);
      expect(containsDataset).to.equal(true);
    });
    it('should return true for a multi-layered tree that includes datasets', () => {
      const tree = newTestTree();
      const containsDataset = indexNodeTreeContainsDataset(tree);
      expect(containsDataset).to.equal(true);
    });
  });

  describe('rebalanceInputWeights', () => {
    it('should return [] when passed an outputIndex with no inputs', () => {
      const tree = createNewOutputIndex();
      const inputs = rebalanceInputWeights(tree.components);
      expect(inputs.length).to.equal(0);
    });
    it('should return [] when passed an index with no inputs', () => {
      const tree = createNewConceptNode();
      const inputs = rebalanceInputWeights(tree.components);
      expect(inputs.length).to.equal(0);
    });
    it("should set the index's weight to 100% when passed a list of one dataset", () => {
      const inputs = rebalanceInputWeights([weightedDatasetComponent]);
      expect(inputs[0].weight).to.equal(100);
    });
    it('should set all weights to 50% when passed two datasets as children', () => {
      const inputs = rebalanceInputWeights([weightedDatasetComponent, weightedDatasetComponent]);
      expect(inputs[0].weight).to.equal(50);
      expect(inputs[1].weight).to.equal(50);
    });
    it('should set all weights to 25% when passed 4 datasets as children', () => {
      const unbalanced_inputs = [
        { ...weightedDatasetComponent },
        { ...weightedDatasetComponent },
        { ...weightedDatasetComponent },
        { ...weightedDatasetComponent },
      ];
      const inputs = rebalanceInputWeights(unbalanced_inputs);
      expect(inputs[0].weight).to.equal(25);
      expect(inputs[1].weight).to.equal(25);
      expect(inputs[2].weight).to.equal(25);
      expect(inputs[3].weight).to.equal(25);
    });
    it('should correctly handle empty nodes', () => {
      const unbalanced_inputs = [
        { ...weightedDatasetComponent },
        { ...emptyWeightedComponent },
        { ...weightedDatasetComponent },
        { ...emptyWeightedComponent },
      ];
      const inputs = rebalanceInputWeights(unbalanced_inputs);
      expect(inputs[0].weight).to.equal(50);
      expect(inputs[2].weight).to.equal(50);
    });
    it('should correctly handle user-specified weights', () => {
      const manuallyWeightedDataset = { ...weightedDatasetComponent };
      manuallyWeightedDataset.isWeightUserSpecified = true;
      manuallyWeightedDataset.weight = 40;
      const unbalanced_inputs = [
        { ...weightedDatasetComponent },
        manuallyWeightedDataset,
        { ...weightedDatasetComponent },
      ];
      const inputs = rebalanceInputWeights(unbalanced_inputs);
      expect(inputs[0].weight).to.equal(30);
      expect(inputs[2].weight).to.equal(30);
    });
  });

  describe('findAllDatasets', () => {
    it('should return an empty list if the tree contains no datasets', () => {
      const result = findAllDatasets(createNewOutputIndex());
      expect(result.length).to.equal(0);
    });
    it('should correctly find all datasets', () => {
      const tree = newTestTree();
      const allDatasets = [
        (tree.components[1].componentNode as ConceptNodeWithoutDataset).components[0].componentNode,
        (
          (tree.components[1].componentNode as ConceptNodeWithoutDataset).components[1]
            .componentNode as ConceptNodeWithoutDataset
        ).components[0].componentNode,
        (
          (tree.components[1].componentNode as ConceptNodeWithoutDataset).components[1]
            .componentNode as ConceptNodeWithoutDataset
        ).components[1].componentNode,
      ];
      const result = findAllDatasets(tree);
      expect(result).to.include.all.members(allDatasets);
    });
  });

  describe('calculateOverallWeight', () => {
    const tree = newTestTree();
    it('should return 0 if the target node is an empty node', () => {
      const tree = createNewOutputIndex();
      tree.components.push(emptyWeightedComponent);
      const result = calculateOverallWeight(tree, emptyWeightedComponent.componentNode);
      expect(result).to.equal(0);
    });
    it('should return 0 if the target node is not found in the tree', () => {
      const result = calculateOverallWeight(tree, createNewConceptNode());
      expect(result).to.equal(0);
    });
    it('should correctly multiply ancestor weights', () => {
      const targetComponent = (tree.components[1].componentNode as ConceptNodeWithoutDataset)
        .components[0];
      const expectedWeight = (tree.components[1].weight * targetComponent.weight) / 100;
      const result = calculateOverallWeight(tree, targetComponent.componentNode);
      expect(result).to.equal(expectedWeight);
    });
  });

  describe('countOppositeEdgesBetweenNodes', () => {
    it('should return -1 when provided a tree with one node', () => {
      const tree = createNewOutputIndex();
      const result = countOppositeEdgesBetweenNodes(createNewConceptNode(), tree);
      expect(result).to.equal(-1);
    });
    it('should return 0 when the target node has a "same" polarity edge directly to the ancestor node', () => {
      const tree = createNewOutputIndex();
      const node = createNewConceptNode();
      addChild(tree, node, null);
      const result = countOppositeEdgesBetweenNodes(node, tree);
      expect(result).to.equal(0);
    });
    it('should return 1 when the target node has an "opposite" polarity edge directly to the ancestor node', () => {
      const tree = createNewOutputIndex();
      const node = createNewConceptNode();
      addChild(tree, node, null);
      tree.components[0].isOppositePolarity = true;
      const result = countOppositeEdgesBetweenNodes(node, tree);
      expect(result).to.equal(1);
    });
    it('should correctly count "opposite" polarity edges when there are multiple', () => {
      const tree = createNewOutputIndex();
      const grandparent = createNewConceptNode();
      const parent = createNewConceptNode();
      const node = createNewConceptNode();
      addChild(tree, grandparent, null);
      tree.components[0].isOppositePolarity = true;
      addChild(grandparent, parent, tree);
      grandparent.components[0].isOppositePolarity = true;
      addChild(parent, node, grandparent);
      parent.components[0].isOppositePolarity = true;
      const result = countOppositeEdgesBetweenNodes(node, tree);
      expect(result).to.equal(3);
    });
  });
});
