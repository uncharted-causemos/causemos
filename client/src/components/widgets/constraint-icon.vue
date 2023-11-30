<template>
  <div class="constraint-icon-container"></div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.constraint-icon-container {
  width: 15px;
  display: inline-flex;
  height: 1.2rem;
  align-items: center;
  justify-content: center;

  &::after {
    content: '';
    width: 8px;
    height: 8px;
    border: 2px solid black;
    background: white;
  }
}
</style>
