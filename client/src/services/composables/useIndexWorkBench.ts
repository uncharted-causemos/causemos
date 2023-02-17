import _ from 'lodash';
import { ref, computed } from 'vue';
import { DataConfig, DatasetSearchResult, IndexWorkBenchItem } from '@/types/Index';
import { getDatacubeById } from '@/services/new-datacube-service';
import { getTimeseries } from '@/services/outputdata-service';
import { Datacube } from '@/types/Datacube';
import {
  findAndRemoveChild,
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

// Temporary index nodes that are being created and not yet attached to the main index tree yet
const workBenchItems = ref<IndexWorkBenchItem[]>([]);
const targetAnalysisId = ref('');

const triggerUpdate = () => {
  workBenchItems.value = [...workBenchItems.value];
};

export default function useIndexWorkBench() {
  // Getters

  const items = computed<IndexWorkBenchItem[]>(() => workBenchItems.value);

  // Actions

  const initialize = (analysisId: string, initialItems: IndexWorkBenchItem[]) => {
    targetAnalysisId.value = analysisId;
    workBenchItems.value = [...initialItems];
  };

  const getAnalysisId = (): string => {
    return targetAnalysisId.value;
  };

  const addItem = (item: IndexWorkBenchItem) => {
    workBenchItems.value = [item, ...workBenchItems.value];
  };

  const findNode = (nodeId: string) => {
    for (const tree of workBenchItems.value) {
      const found = indexTreeUtilFindNode(tree, nodeId);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  };

  const findAndRenameNode = (nodeId: string, newName: string) => {
    const node = findNode(nodeId)?.found;
    if (node !== undefined) {
      node.name = newName;
      triggerUpdate();
    }
  };

  const findAndDeleteItem = (nodeId: string) => {
    let isDeleted = false;
    // Search among root nodes first
    const newItems = workBenchItems.value.filter((item) => item.id !== nodeId);
    isDeleted = newItems.length < workBenchItems.value.length;
    if (isDeleted) {
      workBenchItems.value = newItems;
      return;
    }
    isDeleted = workBenchItems.value.some((tree) => findAndRemoveChild(tree, nodeId));
    if (isDeleted) {
      workBenchItems.value = newItems;
    }
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

  const getDefaultConfig = async (datasetMetadataDocId: string): Promise<DataConfig> => {
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
    items,
    initialize,
    addItem,
    findNode,
    findAndRenameNode,
    findAndDeleteItem,
    findAndAddChild,
    toggleDatasetIsInverted,
    attachDatasetToPlaceholder,
    getAnalysisId,
  };
}
