<template>
  <div class="dropdown-option" @click="clickRadioButton">
    <label
      :for="id"
    >
      <input
        ref="radioButton"
        :id="id"
        :value="id"
        :checked="checked"
        :name="name"
        type="radio"
      > {{ text }}
    </label>
  </div>
</template>

<script>

export default {
  name: 'map-dropdown-option',
  props: {
    id: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    startChecked: {
      type: Boolean,
      required: true
    }
  },
  data: () => ({
    checked: false
  }),
  mounted() {
    if (this.startChecked) {
      this.clickRadioButton();
    }
  },
  methods: {
    clickRadioButton() {
      this.$refs.radioButton.click();
    }
  }
};

</script>

<style scoped>

.dropdown-option {
  padding: 6px 2px;
}

input[type="radio"] {
  appearance: radio;
  margin: 0 8px;
  cursor: pointer;
  position: relative;
  bottom: -2px;
}

label {
  margin: 0;
  font-weight: normal;
  cursor: pointer;
}

</style>
