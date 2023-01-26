<template>
  <!--
    v-bind="$attrs" is required to allow multiple root elements
    https://v3-migration.vuejs.org/new/fragments.html
  -->
  <!-- TODO: replace with real data -->
  <section v-bind="$attrs">
    <!-- TODO: v-if hasBeenRenamed -->
    <h4>Original name: Palmer Drought Severity Index (PDSI)</h4>
    <p class="de-emphasized">
      Palmer Drought Severity Index (from TerraClimate). PDSI uses temperature and precipitation
      data to estimate relative dryness. It is a standardized index that generally ranges from -10
      (dry) to +10 (wet). Maps from agencies like NOAA typically show a range from -4 (extreme
      drought) to +4 (extremely moist).
    </p>
  </section>
  <section>
    <h4>Source: {{ 'TerraClimate PDSI' }}</h4>
    <p class="de-emphasized">
      TerraClimate is a dataset of monthly climate and climatic water balance for global terrestrial
      surfaces from 1958-2019. TerraClimate additionally produces monthly surface water balance
      datasets using a water balance model that incorporates reference evapotranspiration,
      precipitation, temperature, and interpolated plant extractable soil water capacity.
    </p>
  </section>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';

.de-emphasized {
  color: $un-color-black-40;
}
</style>
