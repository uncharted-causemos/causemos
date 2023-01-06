<template>
  <div class="switcher">
    <span v-if="label.length > 0" class="title"> {{ label }} </span>
    <label>
      <input v-model="checkboxModel" :name="name" type="checkbox" @change="handleToggle" />
      <span><small /></span>
    </label>
  </div>
</template>

<script>
import _ from 'lodash';

export default {
  name: 'ToggleButton',
  props: {
    value: {
      type: Boolean,
      default: true,
    },
    name: {
      type: String,
      default: _.uniqueId(),
    },
    label: {
      type: String,
      default: '',
    },
  },
  emits: ['change'],
  data: () => ({
    checkboxModel: true,
  }),
  watch: {
    value() {
      this.checkboxModel = this.value;
    },
  },
  created() {
    this.checkboxModel = this.value;
  },
  methods: {
    handleToggle() {
      this.$emit('change', this.checkboxModel);
    },
  },
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

$toggle-on: #4e4e54;
$toggle-off: $label-color;

$toggle-size: 40px;

.switcher {
  display: flex;
  align-items: center;
  flex-direction: column;
  .title {
    padding: 5px;
    text-align: center;
    font-weight: normal;
  }
  label {
    display: flex;
    padding: 0;
    margin: 0;
    cursor: pointer;
    font-weight: normal;

    * {
      align-self: middle;
    }

    input {
      display: none;

      & + span {
        content: '';
        position: relative;
        display: inline-block;
        width: $toggle-size;
        height: $toggle-size / 2;
        background: $toggle-off;
        border: 1px solid $toggle-off;
        border-radius: 10px;
        transition: all 0.3s ease-in-out;

        small {
          position: absolute;
          display: block;
          width: 50%;
          height: 100%;
          background: #ffffff;
          border-radius: 50%;
          transition: all 0.3s ease-in-out;
          left: 0;
        }
      }
      &:checked + span {
        background: $toggle-on;
        border-color: $toggle-on;
        small {
          left: 50%;
          background: #ffffff;
        }
      }
      & + span::after {
        content: 'Off';
        color: #ffffff;
        position: absolute;
        right: 3px;
        font-size: $font-size-small;
        height: 12px;
      }
      &:checked + span::after {
        content: 'On';
        left: 3px;
      }
    }
  }
}
</style>
