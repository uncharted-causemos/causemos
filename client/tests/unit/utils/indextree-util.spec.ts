import { expect } from 'chai';
import {
  findNode,
  findAndRemoveChild,
  findAndUpdateNode,
  duplicateNode,
  createNewOutputIndex,
  indexNodeTreeContainsDataset,
  rebalanceInputWeights,
  createNewIndex,
  createNewPlaceholderDataset,
  calculateCoverage,
  findAllDatasets,
  calculateOverallWeight,
} from '@/utils/indextree-util';
import { IndexNodeType } from '@/types/Enums';
import { OutputIndex, Index, Dataset, ParentNode } from '@/types/Index';
import { RegionalAggregation } from '@/types/Outputdata';

const newTestTree = (): OutputIndex => ({
  id: '6e4adcee-c3af-4696-b84c-ee1169adcd4c',
  type: IndexNodeType.OutputIndex,
  name: 'Overall Priority',
  inputs: [
    {
      id: '5ad78cb0-b923-48ef-9c1a-31219987ca16',
      type: IndexNodeType.Index,
      name: 'Highest risk of drought',
      weight: 20,
      isWeightUserSpecified: true,
      inputs: [
        {
          id: 'a547b59f-9287-4991-a817-08ba54a0353f',
          type: IndexNodeType.Placeholder,
          name: 'Greatest reliance on fragile crops',
        },
      ],
    },
    {
      id: '6db6284d-7879-4735-a460-5f2b273c0bf9',
      type: IndexNodeType.Index,
      name: 'Largest vulnerable population',
      weight: 60,
      isWeightUserSpecified: true,
      inputs: [
        {
          id: '16caf563-548f-4e11-a488-a900f0d01c3b',
          type: IndexNodeType.Dataset,
          name: 'Highest poverty index ranking',
          weight: 80,
          isWeightUserSpecified: true,
          datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
          datasetMetadataDocId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
          datasetName: 'Poverty indicator index',
          selectedTimestamp: 0,
          isInverted: false,
          source: 'UN',
        },
        {
          id: '2f624d92-efa0-431a-a3a1-5521871420ad',
          type: IndexNodeType.Index,
          name: 'Population Health',
          weight: 0,
          isWeightUserSpecified: true,
          inputs: [
            {
              id: 'd851ac5d-2de2-475d-8ef7-5bd46a1a9016',
              type: IndexNodeType.Dataset,
              name: 'Malnutrition',
              weight: 80,
              isWeightUserSpecified: true,
              datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
              datasetMetadataDocId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
              datasetName: 'Malnutrition rates dataset',
              selectedTimestamp: 0,
              isInverted: false,
              source: 'UN',
            },
            {
              id: 'ac56ea0f-3ca9-4aee-9c06-f98768b7bd2a',
              type: IndexNodeType.Dataset,
              name: 'Life expectancy by country',
              weight: 20,
              isWeightUserSpecified: true,
              datasetId: 'dd7f69937-060d-44e8-8a04-22070ce35b27',
              datasetMetadataDocId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
              datasetName: 'Life expectancy by country',
              selectedTimestamp: 0,
              isInverted: false,
              source: 'UN',
            },
          ],
        },
      ],
    },
  ],
});

describe('indextree-util', () => {
  describe('findNode', () => {
    it('should find a root node', () => {
      const tree = newTestTree();
      const result = findNode(tree, '6e4adcee-c3af-4696-b84c-ee1169adcd4c');

      expect(result?.parent).equal(null);

      expect(result?.found.id).equal('6e4adcee-c3af-4696-b84c-ee1169adcd4c');
      expect(result?.found.type).equal(IndexNodeType.OutputIndex);
      expect(result?.found.name).equal('Overall Priority');
    });
    it('should find a node from direct children', () => {
      const tree = newTestTree();
      const result = findNode(tree, '6db6284d-7879-4735-a460-5f2b273c0bf9');

      expect(result?.parent?.id).equal('6e4adcee-c3af-4696-b84c-ee1169adcd4c');

      expect(result?.found.id).equal('6db6284d-7879-4735-a460-5f2b273c0bf9');
      expect(result?.found.type).equal(IndexNodeType.Index);
      expect(result?.found.name).equal('Largest vulnerable population');
    });
    it('should find a node from leaf nodes', () => {
      const tree = newTestTree();
      const result = findNode(tree, 'ac56ea0f-3ca9-4aee-9c06-f98768b7bd2a');

      expect(result?.parent?.id).equal('2f624d92-efa0-431a-a3a1-5521871420ad');

      expect(result?.found.id).equal('ac56ea0f-3ca9-4aee-9c06-f98768b7bd2a');
      expect(result?.found.type).equal(IndexNodeType.Dataset);
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
      const update: OutputIndex = {
        type: IndexNodeType.OutputIndex,
        id: '6e4adcee-c3af-4696-b84c-ee1169adcd4c',
        name: 'Updated node',
        inputs: [],
      };
      const isUpdated = findAndUpdateNode(tree, update);

      expect(isUpdated).equal(true);
      expect(tree).deep.equal({
        type: IndexNodeType.OutputIndex,
        id: '6e4adcee-c3af-4696-b84c-ee1169adcd4c',
        name: 'Updated node',
        inputs: [],
      });
    });
    it('should update a node', () => {
      const tree = newTestTree();
      const update: Index = {
        id: '6db6284d-7879-4735-a460-5f2b273c0bf9',
        type: IndexNodeType.Index,
        name: 'Largest vulnerable population',
        weight: 0,
        isWeightUserSpecified: false,
        inputs: [
          {
            id: '16caf563-548f-4e11-a488-a900f0d01c3b',
            type: IndexNodeType.Placeholder,
            name: 'Updated Placeholder',
          },
        ],
      };
      const isUpdated = findAndUpdateNode(tree, update);

      expect(isUpdated).equal(true);
      expect(tree).deep.equal({
        id: '6e4adcee-c3af-4696-b84c-ee1169adcd4c',
        type: IndexNodeType.OutputIndex,
        name: 'Overall Priority',
        inputs: [
          {
            id: '5ad78cb0-b923-48ef-9c1a-31219987ca16',
            type: IndexNodeType.Index,
            name: 'Highest risk of drought',
            weight: 20,
            isWeightUserSpecified: true,
            inputs: [
              {
                id: 'a547b59f-9287-4991-a817-08ba54a0353f',
                type: IndexNodeType.Placeholder,
                name: 'Greatest reliance on fragile crops',
              },
            ],
          },
          update,
        ],
      });
    });
    it('should return false if node to be updated is not found', () => {
      const tree = newTestTree();
      const isUpdated = findAndUpdateNode(tree, {
        id: 'not-found-id',
        type: IndexNodeType.Placeholder,
        name: 'Greatest reliance on fragile crops',
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
        type: IndexNodeType.OutputIndex,
        name: 'Overall Priority',
        inputs: [
          {
            id: '5ad78cb0-b923-48ef-9c1a-31219987ca16',
            type: IndexNodeType.Index,
            name: 'Highest risk of drought',
            weight: 20,
            isWeightUserSpecified: true,
            inputs: [
              {
                id: 'a547b59f-9287-4991-a817-08ba54a0353f',
                type: IndexNodeType.Placeholder,
                name: 'Greatest reliance on fragile crops',
              },
            ],
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
      const node = (tree.inputs[1] as Index).inputs[0];
      const dNode = ((duplicated as OutputIndex).inputs[1] as Index).inputs[0];

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
      const tree: OutputIndex = {
        id: '6e4adcee-c3af-4696-b84c-ee1169adcd4c',
        type: IndexNodeType.OutputIndex,
        name: 'Overall Priority',
        inputs: [
          {
            id: '16caf563-548f-4e11-a488-a900f0d01c3b',
            type: IndexNodeType.Dataset,
            name: 'Highest poverty index ranking',
            weight: 100,
            isWeightUserSpecified: true,
            datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
            datasetMetadataDocId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
            datasetName: 'Poverty indicator index',
            selectedTimestamp: 0,
            isInverted: false,
            source: 'UN',
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
    const mock_dataset: Dataset = {
      id: '16caf563-548f-4e11-a488-a900f0d01c3b',
      type: IndexNodeType.Dataset,
      name: 'Highest poverty index ranking',
      weight: 0,
      isWeightUserSpecified: false,
      datasetId: 'b935f602-30b2-48bc-bdc8-10351bbffa67',
      datasetMetadataDocId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
      datasetName: 'Poverty indicator index',
      selectedTimestamp: 0,
      isInverted: false,
      source: 'UN',
    };
    const mock_placeholder_dataset = createNewPlaceholderDataset();
    it('should return [] when passed an outputIndex with no inputs', () => {
      const tree = createNewOutputIndex();
      const inputs = rebalanceInputWeights(tree.inputs);
      expect(inputs.length).to.equal(0);
    });
    it('should return [] when passed an index with no inputs', () => {
      const tree = createNewIndex();
      const inputs = rebalanceInputWeights(tree.inputs);
      expect(inputs.length).to.equal(0);
    });
    it("should set the index's weight to 100% when passed a list of one index", () => {
      const index = createNewIndex();
      const inputs = rebalanceInputWeights([index]);
      expect((inputs[0] as Index).weight).to.equal(100);
    });
    it('should set all weights to 50% when passed two indices as children', () => {
      const index1 = createNewIndex();
      const index2 = createNewIndex();
      const inputs = rebalanceInputWeights([index1, index2]);
      expect((inputs[0] as Index).weight).to.equal(50);
      expect((inputs[1] as Index).weight).to.equal(50);
    });
    it('should set all weights to 25% when passed 4 datasets as children', () => {
      const unbalanced_inputs = [
        { ...mock_dataset },
        { ...mock_dataset },
        { ...mock_dataset },
        { ...mock_dataset },
      ];
      const inputs = rebalanceInputWeights(unbalanced_inputs);
      expect((inputs[0] as Dataset).weight).to.equal(25);
      expect((inputs[1] as Dataset).weight).to.equal(25);
      expect((inputs[2] as Dataset).weight).to.equal(25);
      expect((inputs[3] as Dataset).weight).to.equal(25);
    });
    it('should correctly handle placeholder nodes', () => {
      const unbalanced_inputs = [
        { ...mock_dataset },
        { ...mock_placeholder_dataset },
        { ...mock_dataset },
        { ...mock_placeholder_dataset },
      ];
      const inputs = rebalanceInputWeights(unbalanced_inputs);
      expect((inputs[0] as Dataset).weight).to.equal(50);
      expect((inputs[2] as Dataset).weight).to.equal(50);
    });
    it('should correctly handle user-specified weights', () => {
      const weightedDataset = { ...mock_dataset };
      weightedDataset.isWeightUserSpecified = true;
      weightedDataset.weight = 40;
      const unbalanced_inputs = [{ ...mock_dataset }, weightedDataset, { ...mock_dataset }];
      const inputs = rebalanceInputWeights(unbalanced_inputs);
      expect((inputs[0] as Dataset).weight).to.equal(30);
      expect((inputs[2] as Dataset).weight).to.equal(30);
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
        (tree.inputs[1] as ParentNode).inputs[0],
        ((tree.inputs[1] as ParentNode).inputs[1] as ParentNode).inputs[0],
        ((tree.inputs[1] as ParentNode).inputs[1] as ParentNode).inputs[1],
      ];
      const result = findAllDatasets(tree);
      expect(result).to.include.all.members(allDatasets);
    });
  });

  describe('calculateOverallWeight', () => {
    const tree = newTestTree();
    it('should return 0 if the target node is a Placeholder Dataset', () => {
      const placeholderNode = createNewPlaceholderDataset();
      const tree = createNewOutputIndex();
      tree.inputs.push(placeholderNode);
      const result = calculateOverallWeight(placeholderNode, tree);
      expect(result).to.equal(0);
    });
    it('should return 0 if the target node is not found in the tree', () => {
      const result = calculateOverallWeight(createNewIndex(), tree);
      expect(result).to.equal(0);
    });
    it('should correctly multiply ancestor weights', () => {
      const targetNode = (tree.inputs[1] as Index).inputs[0] as Dataset;
      const expectedWeight = ((tree.inputs[1] as Index).weight * targetNode.weight) / 100;
      const result = calculateOverallWeight(targetNode, tree);
      expect(result).to.equal(expectedWeight);
    });
  });

  describe('calculateCoverage', () => {
    const mockData: RegionalAggregation = {
      country: [
        { id: 'Country A', value: 0 },
        { id: 'Country B', value: 0 },
        { id: 'Country C', value: 0 },
      ],
    };
    const disjointDataset: RegionalAggregation = {
      country: [
        { id: 'Country D', value: 0 },
        { id: 'Country E', value: 0 },
        { id: 'Country F', value: 0 },
      ],
    };
    it('should return empty sets when passed an empty array', () => {
      const { countriesInAllDatasets, countriesInSomeDatasets } = calculateCoverage([]);
      expect(countriesInAllDatasets.size).to.equal(0);
      expect(countriesInSomeDatasets.size).to.equal(0);
    });
    it('should return sets with all countries when passed an array with one item', () => {
      const { countriesInAllDatasets, countriesInSomeDatasets } = calculateCoverage([mockData]);
      const mockCountryList = mockData.country?.map(({ id }) => id) ?? [];
      expect(countriesInAllDatasets).to.have.all.keys(...mockCountryList);
      expect(countriesInSomeDatasets).to.have.all.keys(...mockCountryList);
    });
    describe('countriesInAllDatasets', () => {
      it('should be an empty set when two datasets have no overlap', () => {
        const { countriesInAllDatasets } = calculateCoverage([mockData, disjointDataset]);
        expect(countriesInAllDatasets.size).to.equal(0);
      });
      it('should correctly return the intersection when two datasets have some overlap', () => {
        const overlappingDataset: RegionalAggregation = {
          country: [
            { id: 'Country C', value: 0 },
            { id: 'Country D', value: 0 },
            { id: 'Country E', value: 0 },
          ],
        };
        const { countriesInAllDatasets } = calculateCoverage([mockData, overlappingDataset]);
        expect(countriesInAllDatasets).to.have.key('Country C');
      });
    });
    describe('countriesInSomeDatasets', () => {
      const { countriesInSomeDatasets } = calculateCoverage([mockData, disjointDataset]);
      it('should have a size equal to the size of the union when passed two datasets', () => {
        const expectedSize =
          (mockData.country?.length ?? 0) + (disjointDataset.country?.length ?? 0);
        expect(countriesInSomeDatasets.size).to.equal(expectedSize);
      });
      it('should contain all countries found in both input datasets', () => {
        const mockCountryList = mockData.country?.map(({ id }) => id) ?? [];
        expect(countriesInSomeDatasets).to.include.all.keys(...mockCountryList);
        const disjointCountryList = mockData.country?.map(({ id }) => id) ?? [];
        expect(countriesInSomeDatasets).to.include.all.keys(...disjointCountryList);
      });
    });
  });
});
