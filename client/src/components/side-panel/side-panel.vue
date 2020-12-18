<template>
  <div class="side-panel-container">
    <side-panel-nav
      :tabs="tabs"
      :current-tab-name="currentTabName"
      @set-active="tabName => $emit('set-active', tabName)"
    />
    <div
      v-if="isPanelOpen"
      class="side-panel-body"
    >
      <div class="side-panel-header">
        <h5>{{ currentTabName }}</h5>
        <close-button @click="$emit('set-active', '')" />
      </div>
      <div
        class="side-panel-content"
        :class="{'has-padding': addPadding, 'large': isLarge}"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<script>
import CloseButton from '@/components/widgets/close-button.vue';
import SidePanelNav from '@/components/side-panel/side-panel-nav.vue';

export default {
  name: 'SidePanel',
  components: {
    CloseButton,
    SidePanelNav
  },
  props: {
    tabs: {
      type: Array,
      default: () => []
    },
    currentTabName: {
      type: String,
      default: () => ''
    },
    addPadding: {
      type: Boolean,
      default: false
    },
    isLarge: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    isPanelOpen() {
      for (let i = 0; i < this.tabs.length; i++) {
        if (this.tabs[i].name === this.currentTabName) return true;
      }
      return false;
    }
  }
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';
.side-panel-container {
  flex-grow: 0;
  flex-shrink: 0;
  min-width: $navbar-outer-width;
  height: $content-full-height;
  position: relative;
}

.side-panel-header {
  height: $navbar-outer-width;
  display: flex;
  align-items: center;
  h5 {
    margin: 0;
    margin-left: 8px;
    flex: 1;
  }
  border-bottom: 1px solid $separator;

  .close-button {
    position: relative;
    right: 0; top: 0;
    margin-right: 10px;
  }
}

.side-panel-body {
  position: relative;
  margin-left: $navbar-outer-width; // width of the side-panel-nav
  background-color: #ffffff;
  border-right: 1px solid $separator;
}

.side-panel-content {
  position: relative;
  // A concrete height is required for the list to be scrollable
  //  Subtract the height of the navbar and of the facet-panel-header
  height: calc(100vh - 2 * #{$navbar-outer-width});
  overflow-y: auto;
  overflow-x: hidden;
  width: 16.667vw;
  max-width: 380px;

  &.has-padding {
    padding: 10px;
  }

  &.large {
    width: 25vw;
  }
}

</style>
