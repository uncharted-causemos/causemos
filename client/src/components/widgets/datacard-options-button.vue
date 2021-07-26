<template>
  <div
    class="datacard-options-button"
    :class="{ active: isMenuOpen }"
    @click.stop="onMenuClick"
    @dblclick.stop
  >
    <i
      class="fa fa-fw fa-ellipsis-v"
    />
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
  name: 'DatacardOptionsButton',
  components: {
    DropdownControl
  },
  props: {
    dropdownBelow: {
      type: Boolean,
      default: false
    },
    widerDropdownOptions: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    isMenuOpen: false
  }),
  methods: {
    onMenuClick() {
      this.isMenuOpen = !this.isMenuOpen;
    }
  }
});
</script>

<style lang="scss" scoped>
.options-button-container {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;

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

  &.active, &:hover {
    background:#EAEBEC;

    i {
      color: #000000;
    }
  }
}
</style>
