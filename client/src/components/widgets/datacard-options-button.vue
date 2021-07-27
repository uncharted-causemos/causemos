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

<style lang="scss" scoped>
.datacard-options-button-container {
  border-radius: 50%;
  cursor: pointer;
  width: 18px;
  height: 18px;

  .dropdown-container {
    display: none;
    position: relative;
    right: 50px;
    padding: 0;
    width: fit-content;
    // Clip children overflowing the border-radius at the corners
    overflow: hidden;

    &.below {
      top: 5px;
    }

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
