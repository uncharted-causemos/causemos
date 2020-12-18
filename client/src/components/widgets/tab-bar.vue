<template>
  <ul
    class="unstyled-list"
    :class="{'white-bg': hasWhiteBackground}"
  >
    <li
      v-for="tab in tabs"
      :key="tab.id"
      v-tooltip.top-center="tab.name"
      :class="{active: activeTabId === tab.id}"
      @click="onClick(tab.id)"
    >
      <i
        v-if="tab.icon !== undefined"
        class="fa fa-fw"
        :class="[tab.icon, onlyDisplayIcons ? '' : 'right-margin']"
      />
      {{ onlyDisplayIcons ? null : tab.name }}
    </li>
  </ul>
</template>

<script>
export default {
  name: 'TabBar',
  props: {
    tabs: {
      type: Array,
      required: true
    },
    activeTabId: {
      type: String,
      required: true
    },
    hasWhiteBackground: {
      type: Boolean,
      default: false
    },
    onlyDisplayIcons: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    onClick(tabId) {
      this.$emit('tab-click', tabId);
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";
@import "~styles/wm-theme/wm-theme";

$spaceBetweenTabs: 5px;

ul {
  height: $navbar-outer-height;
  display: flex;
  padding-top: 3px;
}

li {
  padding: 0 15px;
  display: flex;
  position: relative;
  align-items: center;
  color: rgba(0, 0, 0, 0.61);
  cursor: pointer;
  margin-right: $spaceBetweenTabs;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
  overflow: hidden;

  &:last-child {
    margin-right: 0;
  }
}

li:hover {
  background: $color-background-lvl-1;
  color: $color-text-base-dark;
}

li.active {
  background: $color-background-lvl-1;
  color: $selected-dark;

  &::before {
    content: '';
    display: block;
    position: absolute;
    height: 3px;
    width: 100%;
    top: 0;
    left: 0;
    background: $selected;
  }
}

i.right-margin {
  margin-right: 5px;
}

ul.white-bg li {
  border: 1px solid transparent;
  border-bottom: 1px solid $separator;
  overflow: visible;

  &:hover {
    background: transparent;
    border-color: $separator;
    border-bottom-color: transparent;
  }

  &.active {
    background: transparent;
    border-color: $selected;
    border-bottom-color: transparent;

    &::before {
      display: none;
    }
  }

  // Add bottom border between tabs
  &:not(:last-child)::after {
    content: '';
    display: block;
    position: absolute;
    height: 1px;
    width: $spaceBetweenTabs;
    bottom: -1px;
    left: calc(100% + 1px);
    background: $separator;
  }
}
</style>
