<template>
  <div class="not-found">
    <h2>
      <i class="fa fa-fw fa-exclamation-triangle" /> Page Not Found ... <a href="#/">Go Home</a>
    </h2>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'NotFound',
});
</script>

<style lang="scss" scoped>
.not-found {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin: 40px 0px;
}
</style>
