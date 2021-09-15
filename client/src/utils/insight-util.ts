import FilterValueFormatter from '@/formatters/filter-value-formatter';
import FilterKeyFormatter from '@/formatters/filter-key-formatter';
import { Clause, Filters } from '@/types/Filters';

interface MetadataSummary {
  key: string;
  value: string | number | null;
}

function getSourceUrlForExport(insightURL: string, insightId: string, datacubeId: string) {
  if (insightURL.includes('insight_id')) return insightURL;
  // is the url has some params already at its end?
  if (insightURL.includes('?') && insightURL.includes('=')) {
    // append
    if (insightURL.includes('datacubeid=')) {
      return insightURL + '&insight_id=' + insightId;
    }
    return insightURL + '&insight_id=' + insightId + '&datacubeid=' + datacubeId;
  }
  // add
  if (insightURL.includes('datacubeid=')) {
    return insightURL + '?insight_id=' + insightId;
  }
  return insightURL + '?insight_id=' + insightId + '&datacubeid=' + datacubeId;
}

function getFormattedFilterString(filters: Filters) {
  const filterString = filters?.clauses?.reduce((a: string, c: Clause) => {
    return a + `${a.length > 0 ? ' AND ' : ''} ` +
      `${FilterKeyFormatter(c.field)} ${c.isNot ? 'is not' : 'is'} ` +
      `${c.values.map(v => FilterValueFormatter(v, null)).join(', ')}`;
  }, '');
  return `${filterString.length > 0 ? filterString : ''}`;
}

function isQuantitativeView(currentView: string) {
  return currentView === 'modelPublishingExperiment' ||
  currentView === 'data' ||
  currentView === 'dataPreview' ||
  currentView === 'dataComparative';
}

function parseMetadataDetails (
  dataState: any,
  projectMetadata: any,
  formattedFilterString: string,
  currentView: string
): MetadataSummary[] {
  //
  // currentView dictates what kind of metadata should be visible
  //
  // common (from projectMetadata)
  //  - project name
  //  - analysis name
  //
  // datacube drilldown:
  //  - datacube titles
  //  - selected scenario counts
  //  - region(s): top 5
  //
  // comparative analysis
  //  - datacube titles
  //  - region(s): top 5
  //
  // CAG-based views
  //  - corpus
  //  - ontology
  //  - selected scenario id (if any)
  //  - selected node/edge (if any)
  //  - last modified date
  //  - filters (if any)
  const quantitativeView = isQuantitativeView(currentView);
  const arr = [] as MetadataSummary[];

  if (!dataState || !projectMetadata) return arr;

  // @Review: The content of this function needs to be revised and cleaned
  arr.push({
    key: 'Project Name:',
    value: projectMetadata.name
  });

  if (dataState.datacubeTitles) {
    dataState.datacubeTitles.forEach((title: any, indx: number) => {
      arr.push({
        key: 'Name(' + indx.toString() + '):',
        value: title.datacubeOutputName + ' | ' + title.datacubeName
      });
    });
  }
  if (dataState.selectedScenarioIds) {
    arr.push({
      key: 'Selected Scenarios: ',
      value: dataState.selectedScenarioIds.length
    });
  }
  if (dataState.datacubeRegions) {
    arr.push({
      key: 'Region(s): ',
      value: dataState.datacubeRegions
    });
  }
  if (dataState.modelName) {
    arr.push({
      key: 'CAG: ',
      value: dataState.modelName
    });
  }
  if (dataState.nodesCount) {
    arr.push({
      key: 'Nodes Count: ',
      value: dataState.nodesCount
    });
  }
  if (dataState.selectedNode) {
    arr.push({
      key: 'Selected Node: ',
      value: dataState.selectedNode
    });
  }
  if (dataState.selectedEdge) {
    arr.push({
      key: 'Selected Edge: ',
      value: dataState.selectedEdge
    });
  }
  if (dataState.selectedScenarioId) {
    arr.push({
      key: 'Selected Scenario: ',
      value: dataState.selectedScenarioId
    });
  }
  if (dataState.currentEngine) {
    arr.push({
      key: 'Engine: ',
      value: dataState.currentEngine
    });
  }

  if (!quantitativeView) {
    arr.push({
      key: 'Ontology:',
      value: projectMetadata.ontology
    });
    arr.push({
      key: 'Created:',
      value: projectMetadata.created_at
    });
    arr.push({
      key: 'Modified:',
      value: projectMetadata.modified_at
    });
    arr.push({
      key: 'Corpus:',
      value: projectMetadata.corpus_id
    });
    if (formattedFilterString.length > 0) {
      arr.push({
        key: 'Filters:',
        value: formattedFilterString
      });
    }
  }
  return arr;
}

export default {
  parseMetadataDetails,
  getFormattedFilterString,
  getSourceUrlForExport
};
