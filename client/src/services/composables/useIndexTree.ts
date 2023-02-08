import { ref, computed } from 'vue';
import { DatasetSearchResult, OutputIndex } from '@/types/Index';
import {
  findAndRemoveChild,
  createNewOutputIndex,
  findNode as indexTreeUtilFindNode,
  isParentNode,
  createNewPlaceholderDataset,
  createNewIndex,
  isPlaceholderNode,
  convertPlaceholderToDataset,
  isDatasetNode,
  rebalanceInputWeights,
} from '@/utils/indextree-util';
import { IndexNodeType } from '@/types/Enums';

// States

const targetAnalysisId = ref('');

const outputIndexTree = ref<OutputIndex>(createNewOutputIndex());

const triggerUpdate = () => {
  outputIndexTree.value = { ...outputIndexTree.value };
};

export default function useIndexTree() {
  // Getters

  // Export a readonly copy of the tree
  const tree = computed(() => outputIndexTree.value);

  // Actions

  const initialize = (analysisId: string, indexTree: OutputIndex) => {
    targetAnalysisId.value = analysisId;
    outputIndexTree.value = indexTree;
  };

  const getAnalysisId = (): string => {
    return targetAnalysisId.value;
  };

  const findNode = (nodeId: string) => {
    return indexTreeUtilFindNode(outputIndexTree.value, nodeId);
  };

  const findAndRenameNode = (nodeId: string, newName: string) => {
    const node = findNode(nodeId)?.found;
    if (node !== undefined) {
      node.name = newName;
      triggerUpdate();
    }
  };

  const findAndDelete = (nodeId: string) => {
    if (nodeId === outputIndexTree.value.id) {
      // Reset root node
      outputIndexTree.value = createNewOutputIndex();
      return;
    }
    const isDeleted = findAndRemoveChild(outputIndexTree.value, nodeId);
    if (isDeleted) triggerUpdate();
  };

  const findAndAddChild = (
    parentNodeId: string,
    childType: IndexNodeType.Index | IndexNodeType.Dataset
  ) => {
    const parentNode = findNode(parentNodeId)?.found;
    if (parentNode === undefined || !isParentNode(parentNode)) {
      return;
    }
    const newNode =
      childType === IndexNodeType.Dataset ? createNewPlaceholderDataset() : createNewIndex();
    parentNode.inputs.unshift(newNode);
    parentNode.inputs = rebalanceInputWeights(parentNode.inputs);
    triggerUpdate();
  };

  const attachDatasetToPlaceholder = (nodeId: string, dataset: DatasetSearchResult) => {
    const foundResult = findNode(nodeId);
    if (foundResult === undefined || !isPlaceholderNode(foundResult.found)) {
      return;
    }
    const { found: placeholderNode, parent } = foundResult;
    const datasetNode = convertPlaceholderToDataset(placeholderNode, dataset, 0);
    Object.assign(placeholderNode, datasetNode);
    // Parent should never be null unless we found a disconnected placeholder node.
    if (parent !== null) {
      // Update unset siblings with their new auto-balanced weight
      parent.inputs = rebalanceInputWeights(parent.inputs);
    }
    triggerUpdate();
  };

  const toggleDatasetIsInverted = (nodeId: string) => {
    const dataset = findNode(nodeId)?.found;
    if (dataset === undefined || !isDatasetNode(dataset)) {
      return;
    }
    dataset.isInverted = !dataset.isInverted;
    triggerUpdate();
  };

  return {
    tree,
    initialize,
    findNode,
    findAndRenameNode,
    findAndDelete,
    findAndAddChild,
    attachDatasetToPlaceholder,
    getAnalysisId,
    toggleDatasetIsInverted,
  };
}
