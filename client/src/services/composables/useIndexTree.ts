import { ref, computed } from 'vue';
import { DataConfig, DatasetSearchResult, OutputIndex } from '@/types/Index';
import { getDatacubeById } from '@/services/new-datacube-service';
import { getTimeseries } from '@/services/outputdata-service';
import { Datacube } from '@/types/Datacube';
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
import { AggregationOption, IndexNodeType, TemporalResolutionOption } from '@/types/Enums';

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

  const getDefaultConfig = async (datasetMetadataDocId: string) => {
    const metadata: Datacube = await getDatacubeById(datasetMetadataDocId);
    const config: DataConfig = {
      datasetId: metadata.data_id,
      runId: 'indicator',
      outputVariable: metadata.default_feature,
      selectedTimestamp: 0,
      spatialAggregation: metadata.default_view?.spatialAggregation || AggregationOption.Mean,
      temporalAggregation: metadata.default_view?.temporalAggregation || AggregationOption.Mean,
      temporalResolution:
        metadata.default_view?.temporalResolution || TemporalResolutionOption.Month,
    };
    const { data } = await getTimeseries({
      modelId: config.datasetId,
      outputVariable: config.outputVariable,
      runId: config.runId,
      spatialAggregation: config.spatialAggregation,
      temporalAggregation: config.temporalAggregation,
      temporalResolution: config.temporalResolution,
    });
    config.selectedTimestamp = data[0].timestamp;
    return config;
  };

  const attachDatasetToPlaceholder = async (nodeId: string, dataset: DatasetSearchResult) => {
    const foundResult = findNode(nodeId);
    if (foundResult === undefined || !isPlaceholderNode(foundResult.found)) {
      return;
    }
    const { found: placeholderNode, parent } = foundResult;
    const dataConfig = await getDefaultConfig(dataset.datasetMetadataDocId);
    const datasetNode = convertPlaceholderToDataset(placeholderNode, dataset, 0, dataConfig);
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
