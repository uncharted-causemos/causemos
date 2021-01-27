<template>
  <ul
    class="side-panel-nav-container"
    :class="{ 'all-tabs-closed': allTabsAreClosed }"
    role="tablist"
  >
    <li
      v-for="(tab, idx) in tabs"
      :key="idx"
      :class="{ active: tab.name === currentTabName }"
    >
      <button
        v-tooltip.right="tab.name"
        role="tab"
        @click="toggleActive(tab.name)"
      >
        <i :class="tab.icon" />
      </button>
    </li>
  </ul>
</template>

<script>
export default {
  name: 'SidePanelNav',
  props: {
    tabs: {
      type: Array,
      default: () => []
    },
    currentTabName: {
      type: String,
      default: () => ''
    }
  },
  computed: {
    allTabsAreClosed() {
      return this.tabs.find(tab => tab.name === this.currentTabName) === undefined;
    }
  },
  methods: {
    toggleActive(tabName) {
      // If the tab is currently selected, pass '' to signify it should be
      //  unselected. Otherwise, pass the tab's name to select it
      this.$emit('set-active', tabName === this.currentTabName ? '' : tabName);
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";
@import "~styles/wm-theme/wm-theme";

.side-panel-nav-container {
  width: $navbar-outer-width;
  margin: 0;
  padding: 0;
  position: absolute;
  top: 0;
  right: 0;

  // If no tab is open, all tabs should take
  //  the full square width
  &.all-tabs-closed {
    li:not(:hover) {
      transform: translateX(0);
    }
  }
}

li {
  position: relative;
  display: block;
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
  color: rgba(0, 0, 0, 0.61);
  margin-bottom: 5px;
  background: $color-background-lvl-1;
  transform: translateX(-25%);
  transition: transform 0.1s ease;

  // Add a white rectangle to the left of each
  //  tab to show during the hover animation
  &::before {
    content: '';
    display: block;
    position: absolute;
    width: 50%;
    height: 100%;
    top: 0;
    z-index: -1;
    // Overlap the tab slightly to cover tiny
    // gaps during animation
    right: calc(100% - 1px);
    background: $background-light-1;
  }

  button {
    width: $navbar-outer-width;
    height: $navbar-outer-width;
    background-color: transparent;
    border-radius: 0;
    border: none;
  }

  &:not(.active):hover {
    background-color: $background-light-1;
    color: #000;
  }

  &.active {
    transform: translateX(0);
    background-color: $background-light-1;
    color: $selected-dark;
  }

  &:hover {
    transform: translateX(5px);
  }
}
</style>
