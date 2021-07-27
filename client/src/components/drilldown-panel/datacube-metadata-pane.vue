<template>
  <!-- Metadata Pane -->
  <div
    v-if="isFetchingMetadata"
    class="pane-loading-message"
  >
    <i class="fa fa-spin fa-spinner pane-loading-icon" /><span>Loading metadata...</span>
  </div>
  <div
    v-else-if="fullscreenCardMetadata === null"
    class="pane-loading-message"
  >
    <span>Error loading metadata. Please try again.</span>
  </div>
  <div v-else>
    <h5><strong>{{ fullscreenCardMetadata.name }}</strong> ({{ fullscreenCardMetadata.units }})</h5>
    <p
      v-for="(period, index) of fullscreenCardMetadata.period"
      :key="index"
    >
      <em>{{ dateFormatter(Number.parseInt(period.gte), 'MMM YYYY') }}</em>
      -
      <em>{{ dateFormatter(Number.parseInt(period.lte), 'MMM YYYY') }}</em>
    </p>
    <p>{{ fullscreenCardMetadata.description }}</p>
    <p><strong>Source: </strong>{{ fullscreenCardMetadata.source }}</p>
    <p><strong>Model: </strong>{{ fullscreenCardMetadata.modelName }}</p>
    <p>{{ fullscreenCardMetadata.modelDescription }}</p>
    <strong v-if="fullscreenCardMetadata.parameters.length > 0">Parameters:</strong>
    <ul
      v-if="fullscreenCardMetadata.parameters.length > 0"
      class="parameter-metadata"
    >
      <li
        v-for="(parameter, index) of fullscreenCardMetadata.parameters"
        :key="index"
      >
        <strong>{{ parameter.name }}</strong>: {{ parameter.description }}
      </li>
    </ul>
  </div>
</template>

<script>
import _ from 'lodash';
import { getDatacubeById } from '@/services/new-datacube-service';
import dateFormatter from '@/formatters/date-formatter';

export default {
  name: 'DatacubeMetadataPane',
  props: {
    fullscreenCardId: {
      type: String,
      default: null
    }
  },
  data: () => ({
    isFetchingMetadata: false,
    fullscreenCardMetadata: null
  }),
  watch: {
    fullscreenCardId(current, previous) {
      if (current !== null && current !== previous) {
        this.fetchMetadata(this.fullscreenCardId);
      }
    }
  },
  mounted() {
    this.fetchMetadata(this.fullscreenCardId);
  },
  methods: {
    dateFormatter,
    async fetchMetadata(itemId) {
      if (itemId === null) return;
      this.isFetchingMetadata = true;
      this.fullscreenCardMetadata = this.parseRawMetadata(await getDatacubeById(itemId)) || null;
      this.isFetchingMetadata = false;
    },
    parseRawMetadata(raw) {
      const parameters = [];
      if (
        _.isArray(raw.parameters) &&
        _.isArray(raw.parameter_descriptions) &&
        raw.parameters.length === raw.parameter_descriptions.length
      ) {
        raw.parameters.forEach((parameter, index) => {
          parameters.push({ name: parameter, description: raw.parameter_descriptions[index] });
        });
      }
      return {
        name: raw.output_name,
        description: raw.output_description,
        units: raw.output_units,
        source: raw.source,
        modelName: raw.label,
        modelDescription: raw.model_description,
        period: raw.period,
        parameters
        // TODO: aggregation method
        // TODO: periodicity
        // TODO: limitations
        // TODO: statistical concept and methodology
      };
    }
  }
};
</script>

<style lang="scss" scoped>

.parameter-metadata {
  padding-inline-start: 20px;
}

</style>
