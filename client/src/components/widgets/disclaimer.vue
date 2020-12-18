<template>
  <span class="disclaimer-container">{{ message }}</span>
</template>

<script>
export default {
  name: 'Disclaimer',
  props: {
    message: {
      type: String,
      required: true
    }
  }
};
</script>

<style lang="scss" scoped>

.disclaimer-container {
  text-align: right;
  width: 100%;
  padding: 10px;
  color: #9C9D9E;
}

</style>
