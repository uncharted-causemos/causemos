<template>
  <!-- TODO: replace with map showing real coverage -->
  <div class="map placeholder" v-bind="$attrs"><button disabled class="btn">Expand</button></div>
  <p class="de-emphasized">{{ displayString }}</p>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  countries: string[] | null;
}>();

const displayString = computed(() => {
  if (props.countries === null) {
    return '...';
  }
  const count = props.countries.length;
  return `Covers ${count} countr${count === 1 ? 'y' : 'ies'}.`;
});
</script>

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
