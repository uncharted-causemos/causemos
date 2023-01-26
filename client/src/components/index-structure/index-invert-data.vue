<template>
  <h4 @click="isInverted = !isInverted" class="clickable">
    <i
      class="fa fa-fw"
      :class="{
        'fa-check-square-o': isInverted,
        'fa-square-o': !isInverted,
      }"
    />
    Invert data
  </h4>
  <!-- TODO: replace with real data -->
  <p class="de-emphasized">
    Higher <strong>{{ 'Palmer Drought Severity Index (PDSI)' }}</strong> values indicate
    {{ isInverted ? 'lower' : 'higher' }}
    <strong>{{ 'Greatest recent temperature increase' }}</strong> values.
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const isInverted = ref(false);
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';

.clickable {
  cursor: pointer;
  user-select: none;
}

.de-emphasized {
  color: $un-color-black-40;
}
</style>
