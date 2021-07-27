<template>
  <div
    class="datacard-options-button-container"
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

<style lang="scss">
.datacard-options-button-container .dropdown-container .dropdown-option {
  border: 1px solid #9D9E9E;
}
</style>

<style lang="scss" scoped>
.datacard-options-button-container {
  border-radius: 50%;
  cursor: pointer;
  width: 18px;
  height: 18px;
  color: #9D9E9E;

  .dropdown-container {
    display: none;
    position: relative;
    right: 60px;
    padding: 0;
    width: fit-content;
    border-radius: 0;
    box-shadow: none;
    // Clip children overflowing the border-radius at the corners
    overflow: hidden;

    &.visible {
      display: block;
    }
  }

  &.active, &:hover {
    background: #EAEBEC;

    i {
      color: #000000;
    }
  }
}
</style>
