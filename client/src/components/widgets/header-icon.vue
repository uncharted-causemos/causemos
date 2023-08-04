<template>
  <div class="header-icon-container"><i class="fa" :class="['fa-' + props.icon]" /></div>
</template>

<script setup lang="ts">
const props = defineProps<{ icon: string }>();
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
.header-icon-container {
  display: flex;
  padding: 7px;
  border-radius: 26px;
  background: $un-color-black-5;
}

i {
  color: $un-color-black-70;
  font-size: 1.6rem;
}
</style>
