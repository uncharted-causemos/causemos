<template>
  <div class="comp-analysis-experiment-container">
    <button class="search-button btn btn-primary btn-call-for-action" disabled>
      Search datacubes
    </button>
    <!-- TODO: whether a card is actually expanded or not will
    be dynamic later -->
    <datacube-card :class="{ 'datacube-expanded': true }" />
  </div>
</template>

<script lang="ts">
import DatacubeCard from '@/components/data/datacube-card.vue';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'CompAnalysisExperiment',
  components: { DatacubeCard }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
.comp-analysis-experiment-container {
  height: $content-full-height;
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.datacube-expanded {
  flex: 1;
}

.search-button {
  align-self: center;
  margin-bottom: 10px;
}
</style>
