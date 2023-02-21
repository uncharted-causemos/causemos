import { DataConfig, DatasetSearchResult } from '@/types/Index';
import { getDatacubeById } from '@/services/new-datacube-service';
import { getTimeseries } from '@/services/outputdata-service';
import { Datacube } from '@/types/Datacube';
import {
  isParentNode,
  createNewPlaceholderDataset,
  createNewIndex,
  isPlaceholderNode,
  convertPlaceholderToDataset,
  isDatasetNode,
  rebalanceInputWeights,
  FindNodeResult,
} from '@/utils/indextree-util';
import { AggregationOption, IndexNodeType, TemporalResolutionOption } from '@/types/Enums';

interface BaseActions {
  findNode: (nodeId: string) => FindNodeResult;
  triggerUpdate: () => void;
}

const getDefaultDataConfig = async (datasetMetadataDocId: string) => {
  const metadata: Datacube = await getDatacubeById(datasetMetadataDocId);
  const config: DataConfig = {
    datasetId: metadata.data_id,
    runId: 'indicator',
    outputVariable: metadata.default_feature,
    selectedTimestamp: 0,
    spatialAggregation: metadata.default_view?.spatialAggregation || AggregationOption.Mean,
    temporalAggregation: metadata.default_view?.temporalAggregation || AggregationOption.Mean,
    temporalResolution: metadata.default_view?.temporalResolution || TemporalResolutionOption.Month,
  };
  const { data } = await getTimeseries({
    modelId: config.datasetId,
    outputVariable: config.outputVariable,
    runId: config.runId,
    spatialAggregation: config.spatialAggregation,
    temporalAggregation: config.temporalAggregation,
    temporalResolution: config.temporalResolution,
  });
  config.selectedTimestamp = data[data.length - 1].timestamp;
  return config;
};

/**
 * useIndexTreeActions composes and creates more complex action functions using given functions provided by the base
 * @param base object containing base action functions
 */
export default function useIndexTreeActions(base: BaseActions) {
  const { findNode, triggerUpdate } = base;

  const findAndRenameNode = (nodeId: string, newName: string) => {
    const node = findNode(nodeId)?.found;
    if (node !== undefined) {
      node.name = newName;
      triggerUpdate();
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

  const attachDatasetToPlaceholder = async (nodeId: string, dataset: DatasetSearchResult) => {
    const foundResult = findNode(nodeId);
    if (foundResult === undefined || !isPlaceholderNode(foundResult.found)) {
      return;
    }
    const { found: placeholderNode, parent } = foundResult;
    const dataConfig = await getDefaultDataConfig(dataset.datasetMetadataDocId);
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
    findAndRenameNode,
    findAndAddChild,
    attachDatasetToPlaceholder,
    toggleDatasetIsInverted,
  };
}
