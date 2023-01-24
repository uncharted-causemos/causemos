<template>
  <div class="index-drilldown-panel-container">
    <header>
      <span v-if="type === IndexNodeType.OutputIndex" class="type-label"> Output Index </span>
      <div class="title-row" :class="{ 'space-between': canDeleteSelectedNode }">
        <h3>{{ panelTitle }}</h3>
        <div class="button-group">
          <button class="btn btn-sm" disabled>Rename</button>
          <button v-if="canDeleteSelectedNode" class="btn btn-sm" disabled>
            <i class="fa fa-ellipsis-v" />
          </button>
        </div>
      </div>
    </header>
    <template v-if="type === IndexNodeType.Dataset">
      <section>
        <!-- TODO: replace with map showing real coverage -->
        <div class="map placeholder"><button disabled class="btn">Expand</button></div>
        <!-- TODO: replace with real spatial coverage. -->
        <p class="de-emphasized">Covers 182 countries.</p>
      </section>
      <section>
        <!-- TODO: v-if hasBeenRenamed -->
        <h4>Original name: Palmer Drought Severity Index (PDSI)</h4>
        <p class="de-emphasized">
          Palmer Drought Severity Index (from TerraClimate). PDSI uses temperature and precipitation
          data to estimate relative dryness. It is a standardized index that generally ranges from
          -10 (dry) to +10 (wet). Maps from agencies like NOAA typically show a range from -4
          (extreme drought) to +4 (extremely moist).
        </p>
      </section>
      <section>
        <!-- TODO: replace with real source name -->
        <h4>Source: {{ 'TerraClimate PDSI' }}</h4>
        <p class="de-emphasized">
          TerraClimate is a dataset of monthly climate and climatic water balance for global
          terrestrial surfaces from 1958-2019. TerraClimate additionally produces monthly surface
          water balance datasets using a water balance model that incorporates reference
          evapotranspiration, precipitation, temperature, and interpolated plant extractable soil
          water capacity.
        </p>
      </section>
      <section>
        <h4>Selected date</h4>
        <!-- TODO: replace with real selected date name -->
        <p>
          Using data from <strong>{{ 'December 2019' }}</strong> in index results.
        </p>
        <div class="timeseries placeholder" />
      </section>
      <section>
        <!-- TODO: connect checkbox -->
        <h4>Invert data</h4>
        <!-- TODO: replace with real data -->
        <p class="de-emphasized">
          Higher <strong>{{ 'Palmer Drought Severity Index (PDSI)' }}</strong> values indicate
          {{ 'higher' }} <strong>{{ 'Greatest recent temperature increase' }}</strong> values.
        </p>
      </section>
    </template>
    <IndexComponentWeights v-if="shouldShowWeights" />
    <section v-if="type === IndexNodeType.OutputIndex" class="results">
      <h4>Index results</h4>
      <button class="btn" disabled>See results</button>
    </section>
    <IndexDocumentSnippets :selected-node-name="panelTitle" />
  </div>
</template>

<script setup lang="ts">
import { IndexNodeType } from '@/types/Enums';
import IndexComponentWeights from './index-component-weights.vue';
import IndexDocumentSnippets from './index-document-snippets.vue';
import { computed } from 'vue';

// TODO: populate from props
const type = IndexNodeType.Dataset;
const panelTitle = 'Overall priority';
const shouldShowWeights = computed(
  () => type === IndexNodeType.OutputIndex || type === IndexNodeType.Index
);
const canDeleteSelectedNode = computed(() => type !== IndexNodeType.OutputIndex);
</script>

<style scoped lang="scss">
@import '~styles/variables';
@import '~styles/uncharted-design-tokens';
.index-drilldown-panel-container {
  padding: 40px 88px;
  background: white;
  border-left: 1px solid #f0f1f2;
  display: flex;
  flex-direction: column;
  gap: 30px;
  overflow-y: auto;
}

header {
  display: flex;
  flex-direction: column;
}

.button-group {
  display: flex;
  gap: 5px;
}

.title-row {
  display: flex;
  gap: 10px;
  align-items: center;

  &.space-between {
    justify-content: space-between;
  }
}

.type-label {
  color: $accent-main;
}

section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.results {
  gap: 10px;
  align-items: flex-start;
}

.map {
  height: 200px;
  position: relative;
  button {
    position: absolute;
    bottom: 10px;
    right: 10px;
  }
}

.placeholder {
  background: $un-color-black-5;
}

.de-emphasized {
  color: $un-color-black-40;
}

.timeseries {
  height: 100px;
}
</style>
