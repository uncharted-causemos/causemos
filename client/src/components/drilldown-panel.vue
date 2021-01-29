<template>
  <div
    class="drilldown-panel-container"
    :class="{ 'closed': isOpen !== null && !isOpen }"
  >
    <div
      v-if="isOpen !== null"
      class="navigation-button close-button"
      @click="onClose"
    >
      <i
        class="fa fa-fw fa-close"
      />
    </div>
    <tab-bar
      v-if="tabs.length > 1"
      :tabs="tabs"
      :active-tab-id="activeTabId"
      has-white-background
      only-display-icons
      @tab-click="onTabClick"
    />
    <div class="panel-header">
      <h5>{{ paneTitle }}</h5>
      <slot name="action" />
    </div>
    <div class="panel-content">
      <hr class="pane-separator">
      <slot name="content" />
    </div>
    <div
      class="overlay-pane"
      :class="{ 'open': isOverlayOpen }"
    >
      <div class="panel-header">
        <div
          class="navigation-button back-button"
          @click="onOverlayBack"
        >
          <i
            class="fa fa-fw fa-angle-left"
          />
        </div>
        <h5>{{ overlayPaneTitle }}</h5>
      </div>
      <hr class="pane-separator">
      <slot name="overlay-pane" />
    </div>
  </div>
</template>

<script>
import TabBar from './widgets/tab-bar.vue';

export default {
  name: 'DrilldownPanel',
  components: {
    TabBar
  },
  props: {
    // If isOpen isn't passed, no close button
    //  is shown.
    isOpen: {
      type: Boolean,
      default: null
    },
    tabs: {
      type: Array,
      default: () => []
    },
    activeTabId: {
      type: String,
      default: ''
    },
    overlayPaneTitle: {
      type: String,
      default: '[Overlay Header]'
    },
    isOverlayOpen: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
  }),
  computed: {
    paneTitle() {
      const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
      return activeTab === undefined ? '[Panel Title]' : activeTab.name;
    }
  },
  mounted() {
  },
  methods: {
    onClose() {
      this.$emit('close');
    },
    getClassObject(icon) {
      // This hacky way of binding the :class to a dynamic icon
      //  is to get around the Vue constraint that interpolation
      //  is no longer allowed inside the class attribute
      const classObject = {};
      classObject[icon] = true;
      return classObject;
    },
    onTabClick(tabID) {
      this.$emit('tab-click', tabID);
    },
    onOverlayBack() {
      this.$emit('overlay-back');
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/wm-theme/wm-theme";
@import "~styles/variables";

.drilldown-panel-container {
  height: $content-full-height;
  width: 25vw;
  flex-shrink: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: $color-background-lvl-2;
  padding: 0 8px;
  overflow: hidden;

  &.closed {
    display: none;
  }

  /deep/ .panel-header {
    height: 56px; // 56px = 32px button + (2 * 12px) padding above and below
    display: flex;
    align-items: center;
    justify-content: space-between;

    h5 {
      margin: 0;
      line-height: 18px;
    }
  }

  /deep/ .pane-summary {
    padding: 12px 5px;
    font-size: $font-size-large;
    font-weight: 600;

    .icon {
      // Spacing for summaries that include arrow icons (e.g. the Evidence pane)
      margin: 0 4px;
    }
  }

  /deep/ .pane-loading-message {
    padding: 12px 8px;

    .pane-loading-icon ~ span {
      margin-left: 4px;
    }
  }
}

.navigation-button {
  font-size: 16px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: $color-btn-default-hover;
  cursor: pointer;

  &:hover {
    color: $color-text-base-dark;
  }
}

.close-button {
  position: absolute;
  top: 12px;
  right: 12px;
}

.back-button {
  font-size: 24px;
  margin-right: 8px;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
}

.overlay-pane {
  position: absolute;
  width: 25vw;
  left: 25vw;
  top: 0;
  bottom: 0;
  background: $color-background-lvl-2;
  padding: 0 8px;
  opacity: 0;
  transition: left 0.3s ease-out, opacity 0.3s ease-out;

  .panel-header {
    // Override 'space-between' so that back button and text are
    //  both aligned left
    justify-content: start;
  }

  &.open {
    left: 0;
    opacity: 1;
  }
}
</style>
