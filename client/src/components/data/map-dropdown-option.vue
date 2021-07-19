<template>
  <div
    class="dropdown-option"
  >
    <i
      class="fa fa-lg fa-fw radio"
      :class="{ 'fa-circle-o': !selected}"
    >
      <i class="fa fa-circle"/>
    </i>
    <div class="option-label">
      {{ text }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'map-dropdown-option',
  props: {
    selected: {
      type: Boolean,
      required: true
    },
    text: {
      type: String,
      default: ''
    }
  }
};
</script>

<style scoped>

.dropdown-option {
  cursor: pointer;
  display: flex;
}

.radio {
  margin: 3px 0 0 0;
}
</style>
