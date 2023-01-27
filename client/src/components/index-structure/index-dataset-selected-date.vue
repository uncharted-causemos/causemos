<template>
  <h4>Selected date</h4>
  <!-- TODO: replace with real selected date name -->
  <p>
    Using data from <strong>{{ 'December 2019' }}</strong> in index results.
  </p>
  <div class="timeseries placeholder" v-bind="$attrs" />
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';

.placeholder {
  background: $un-color-black-5;
}

.timeseries {
  height: 100px;
}
</style>
