<template>
  <div>
    <div><b>Project</b>: {{metadataDetails.projectName}}</div>

    <div v-if="metadataDetails.analysisName !== undefined"><b>Analysis</b>: {{metadataDetails.analysisName}}</div>
    <template v-if="metadataDetails.datacubes !== undefined">
      <div><b>Datacubes</b>:</div>
      <div v-for="(datacube, indx) in metadataDetails.datacubes" :key="indx" class="datacube-items">
          <div><i class="fa fa-circle output-name" />{{datacube.outputName}}</div>
          <div class="dataset-and-source">{{datacube.datasetName}}</div>
          <div class="dataset-and-source">{{datacube.source}}</div>
      </div>
    </template>

    <div v-if="metadataDetails.cagName !== undefined"><b>CAG</b>: {{metadataDetails.cagName}}</div>
    <div v-if="metadataDetails.ontology !== undefined"><b>Ontology</b>: {{metadataDetails.ontology}}</div>
    <div v-if="ontologyCreatedAt !== null"><b>Ontology created at</b>: {{ontologyCreatedAt}}</div>
    <div v-if="ontologyModifiedAt !== null"><b>Ontology modified at</b>: {{ontologyModifiedAt}}</div>
    <div v-if="metadataDetails.corpus_id !== undefined"><b>Corpus</b>: {{metadataDetails.corpus_id}}</div>
    <div v-if="metadataDetails.currentEngine !== undefined"><b>Engine</b>: {{metadataDetails.currentEngine}}</div>
    <div v-if="metadataDetails.nodesCount !== undefined"><b>Number of Nodes</b>: {{metadataDetails.nodesCount}}</div>
    <div v-if="metadataDetails.selectedNode !== undefined"><b>Selected Node</b>: {{metadataDetails.selectedNode}}</div>
    <div v-if="metadataDetails.selectedEdge !== undefined"><b>Selected Edge</b>: {{metadataDetails.selectedEdge}}</div>
    <div v-if="metadataDetails.selectedCAGScenario !== undefined"><b>CAG Scenario</b>: {{metadataDetails.selectedCAGScenario}}</div>
    <div v-if="metadataDetails.filters !== undefined"><b>Filters</b>: {{metadataDetails.filters}}</div>

    <div v-if="insightLastUpdate !== null"><b>Insight last update</b>: {{insightLastUpdate}}</div>
  </div>
</template>

<script lang="ts">
import { InsightMetadata } from '@/types/Insight';
import { defineComponent, PropType } from 'vue';
import dateFormatter from '@/formatters/date-formatter';

const formatDate = (date: number) => {
  return dateFormatter(date, 'YYYY-MM-DD hh:mm:ss a');
};

export default defineComponent({
  name: 'InsightSummary',
  props: {
    metadataDetails: {
      type: Object as PropType<InsightMetadata>,
      required: true
    }
  },
  computed: {
    insightLastUpdate(): string | null {
      if (this.metadataDetails.insightLastUpdate !== undefined) {
        return formatDate(this.metadataDetails.insightLastUpdate);
      }
      return null;
    },
    ontologyCreatedAt(): string | null {
      if (this.metadataDetails.ontology_created_at !== undefined) {
        return formatDate(this.metadataDetails.ontology_created_at);
      }
      return null;
    },
    ontologyModifiedAt(): string | null {
      if (this.metadataDetails.ontology_modified_at !== undefined) {
        return formatDate(this.metadataDetails.ontology_modified_at);
      }
      return null;
    }
  }
});
</script>

<style lang="scss" scoped>

.datacube-items {
  display: flex;
  flex-direction: column;

  .output-name {
    font-size: x-small;
    padding-right: 4px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }

  .dataset-and-source {
    padding-left: 12px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
}
</style>
