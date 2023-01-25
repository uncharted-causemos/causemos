import { expect } from 'chai';
import { findNode, findAndRemoveChild, findAndUpdateNode } from '@/utils/indextree-util';
import { IndexNodeType } from '@/types/Enums';
import { OutputIndex, Index } from '@/types/Index';

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
          datasetName: 'Poverty indicator index',
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
              datasetName: 'Malnutrition rates dataset',
              isInverted: false,
              source: 'UN',
            },
            {
              id: 'ac56ea0f-3ca9-4aee-9c06-f98768b7bd2a',
              type: IndexNodeType.Dataset,
              name: 'Life expectancy by country',
              weight: 20,
              isWeightUserSpecified: true,
              datasetId: 'd7f69937-060d-44e8-8a04-22070ce35b27',
              datasetName: 'Life expectancy by country',
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
});
