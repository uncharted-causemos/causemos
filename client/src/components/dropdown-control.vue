<template>
  <div class="dropdown-container">
    <slot name="content" />
    <slot name="footer" />
  </div>
</template>

<script>

/**
 * A menu dropdown wrapper for corrections that allows the injection of one external
 * fragments into the template slot.
 *
 * - content: elements to be displayed
 *
*/

export default {
  name: 'DropdownControl'
};
</script>

<style lang="scss">
@import "~styles/wm-theme/wm-theme";
@import '~styles/variables';

.dropdown-container {
  position: relative;
  display: block;
  background: $color-background-lvl-2;
  box-sizing: border-box;
  opacity: 1;
  z-index: map-get($z-index-order, corrections-dropdown);
  border-radius: 4px;
  box-shadow: 0 -1px 0 #e5e5e5, 0 0 2px rgba(0,0,0,.12), 0 2px 4px rgba(0,0,0,.24);
  color: $color-text-base-dark;
  overflow: hidden;
}

.dropdown-option {
  cursor: pointer;
  padding: 8px 12px;
  // Stop button text from being selected when menu is opened
  user-select: none;

  &:hover {
    background:#EAEBEC;
  }
}

.dropdown-title {
  height: 56px;
  display: flex;
  align-items: center;
  padding-left: 10px;
}

</style>
