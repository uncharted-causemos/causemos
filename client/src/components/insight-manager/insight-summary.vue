<template>
  <div>
    <div v-if="projectMetadata.name"><strong>Project</strong>: {{ projectMetadata.name }}</div>

    <template v-if="metadataDetails.datacubes !== undefined">
      <div><strong>Datacubes</strong>:</div>
      <div v-for="(datacube, indx) in metadataDetails.datacubes" :key="indx" class="datacube-items">
        <div><i class="fa fa-circle output-name" />{{ datacube.outputName }}</div>
        <div class="dataset-and-source">{{ datacube.datasetName }}</div>
        <div class="dataset-and-source">{{ datacube.source }}</div>
      </div>
    </template>

    <div v-if="insightLastUpdate !== null">
      <b>Insight last updated at</b>: {{ insightLastUpdate }}
    </div>
  </div>
</template>

<script lang="ts">
import { InsightMetadata } from '@/types/Insight';
import { defineComponent, PropType } from 'vue';
import dateFormatter from '@/formatters/date-formatter';
import { mapGetters } from 'vuex';

const formatDate = (date: number) => {
  return dateFormatter(date, 'MMM DD, YYYY, h:mm a');
};

export default defineComponent({
  name: 'InsightSummary',
  props: {
    metadataDetails: {
      type: Object as PropType<InsightMetadata>,
      required: true,
    },
  },
  computed: {
    ...mapGetters({
      projectMetadata: 'app/projectMetadata',
    }),
    insightLastUpdate(): string | null {
      if (this.metadataDetails.insightLastUpdate !== undefined) {
        return formatDate(this.metadataDetails.insightLastUpdate);
      }
      return null;
    },
  },
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
