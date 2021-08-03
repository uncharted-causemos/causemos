<template>
  <div class="map-dropdown-category">
    <div>{{ text }}</div>
  </div>
</template>

<script>

export default {
  name: 'MapDropdownCategory',
  props: {
    text: String,
    default: () => ''
  }
};

</script>

<style scoped>

.map-dropdown-category {
  padding: 6px 10px;
  color: #707070;
  font-weight: bold;
  background-color: #f2f2f2;
  border-top: 1px solid lightgray;
  border-bottom: 1px solid lightgray;
}

</style>
