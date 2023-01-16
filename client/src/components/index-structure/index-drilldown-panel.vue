<template>
  <div class="index-drilldown-panel content-full">drilldown panel</div>
</template>
<script setup lang="ts"></script>
<style scoped lang="scss">
.index-drilldown-panel {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 40px 88px;

  position: absolute;
  width: 30%;
  max-width: 767px;
  right: 0;

  background: #ffffff;
  border-left: 1px solid #f0f1f2;
}
</style>
