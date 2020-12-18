<template>
  <ul
    class="side-panel-nav-container"
    role="tablist">
    <li
      v-for="(tab, idx) in tabs"
      :key="idx"
      :class="{ active: tab.name === currentTabName }"
    >
      <button
        v-tooltip.right="tab.name"
        class="btn"
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
@import '~styles/variables';

.side-panel-nav-container {
  width: $navbar-outer-width;
  margin: 0;
  padding: 0;
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  background-color: #EAEBEC;

  li {
    position: relative;
    display: block;

    button {
      width: $navbar-outer-width;
      height: $navbar-outer-width;
      background-color: transparent;
      border-radius: 0;
    }

    &.active {
      button {
        color: #ffffff;
        background-color: #545353;
      }
    }
  }
}
</style>
