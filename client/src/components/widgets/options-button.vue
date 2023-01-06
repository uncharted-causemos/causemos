<template>
  <div
    class="options-button-container"
    :class="{ active: isMenuOpen }"
    @click.stop="onMenuClick"
    @dblclick.stop
  >
    <i class="fa fa-fw fa-ellipsis-v" />
    <dropdown-control
      :class="{ visible: isMenuOpen, below: dropdownBelow, wider: widerDropdownOptions }"
    >
      <template #content>
        <slot name="content" />
      </template>
    </dropdown-control>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import DropdownControl from '@/components/dropdown-control.vue';

export default defineComponent({
  name: 'OptionsButton',
  components: {
    DropdownControl,
  },
  props: {
    dropdownBelow: {
      type: Boolean,
      default: false,
    },
    widerDropdownOptions: {
      type: Boolean,
      default: false,
    },
  },
  data: () => ({
    isMenuOpen: false,
  }),
  methods: {
    onMenuClick() {
      this.isMenuOpen = !this.isMenuOpen;
    },
  },
});
</script>

<style lang="scss" scoped>
.options-button-container {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  position: relative;

  i {
    text-align: center;
    width: 100%;
    font-size: 18px;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: #9d9e9e;
  }

  .dropdown-container {
    display: none;
    position: absolute;
    bottom: 32px;
    right: 32px;
    padding: 0;
    width: 100px;
    // Clip children overflowing the border-radius at the corners
    overflow: hidden;

    &.wider {
      width: 150px;
    }

    &.below {
      bottom: auto;
      top: 32px;
    }

    &.visible {
      display: block;
    }
  }

  &.active,
  &:hover {
    background: #eaebec;

    i {
      color: #000000;
    }
  }
}
</style>
