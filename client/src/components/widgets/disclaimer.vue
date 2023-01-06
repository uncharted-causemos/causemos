<template>
  <span class="disclaimer-container">{{ message }}</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'Disclaimer',
  props: {
    message: {
      type: String,
      required: true,
    },
  },
});
</script>

<style lang="scss" scoped>
.disclaimer-container {
  text-align: right;
  width: 100%;
  padding: 10px;
  color: #9c9d9e;
}
</style>
