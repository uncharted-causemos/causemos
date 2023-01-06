<template>
  <div class="badge-container">
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Badge',
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.badge-container {
  font-weight: normal;
  background: #edf4f7;
  border: 1px solid #a2cceb;
  border-radius: 3px;
  font-size: $font-size-small;
  color: #2b495f;
  border-radius: 3px;
  padding: 5px;
  line-height: 1;
  display: inline-block;
}
</style>
