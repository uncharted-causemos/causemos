<template>
  <ul>
    <li
      v-for="tab in tabs"
      :key="tab.id"
      v-tooltip.top-center="tab.name"
      :class="{ active: activeTabId === tab.id }"
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

<script lang="ts">
import { PropType, defineComponent } from 'vue';

// Copied from `drilldown-panel.vue`
interface DrilldownPanelTab {
  id: string;
  name: string;
  icon?: string;
}

export default defineComponent({
  name: 'TabBar',
  props: {
    tabs: {
      type: Array as PropType<DrilldownPanelTab[]>,
      required: true,
    },
    activeTabId: {
      type: String,
      default: '',
    },
    onlyDisplayIcons: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['tab-click'],
  methods: {
    onClick(tabId: string) {
      this.$emit('tab-click', tabId);
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

$spaceBetweenTabs: 5px;

ul {
  height: $navbar-outer-height;
  display: flex;
  list-style: none;
  margin: 0;
  padding: 3px 0 0;
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
  background: $background-light-2;
  color: $text-color-dark;
}

li.active {
  background: $background-light-2;
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
</style>
