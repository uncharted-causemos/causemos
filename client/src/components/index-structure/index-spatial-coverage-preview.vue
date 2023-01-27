<template>
  <!-- TODO: replace with map showing real coverage -->
  <div class="map placeholder" v-bind="$attrs"><button disabled class="btn">Expand</button></div>
  <!-- TODO: replace with real spatial coverage. -->
  <p class="de-emphasized">Covers 182 countries.</p>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';

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
</style>
