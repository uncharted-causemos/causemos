<template>
  <div class="collapsible-container">
    <div class="item-container">
      <div class="item-controls">
        <slot name="controls" />
      </div>
      <div
        class="item-title"
        @click="toggle()">
        <i
          :class="{ 'fa fa-angle-down fa-fw': expanded, 'fa fa-angle-right fa-fw': !expanded }"
        />
        <slot name="title" />
      </div>
    </div>
    <div v-if="expanded === true">
      <slot name="content" />
    </div>
  </div>
</template>

<script>

import _ from 'lodash';

/**
 * A collapsible wrapper component that allows the injection of two external
 * fragments into the template slots.
 *
 * - title: title bar elements
 * - content: elements to be displayed
 *
 * For example:
 *   <collapsible-item>
 *      <div slot="header"> This replaces the header slot in template</div>
 *      <p slot="content">
 *          This paragraph replaces the content slot in template
 *          <img src="something"/>
 *      </p>
 *   </collapsible-item>
 *
*/
export default {
  name: 'CollapsibleItem',
  props: {
    override: {
      type: Object,
      default: null
    },
    defaultExpand: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    expanded: false
  }),
  watch: {
    // A bit of a hack here, using object {value: true|false} in order to make watcher fire on consecutive true or false values
    override() {
      if (_.isNil(this.override)) return;
      this.expanded = this.override.value;
    }
  },
  mounted() {
    if (_.isNil(this.override) && !this.defaultExpand) return;
    if (!_.isNil(this.override)) {
      this.expanded = this.override.value;
    } else if (this.defaultExpand) {
      this.expand();
    }
  },
  methods: {
    expand() {
      this.expanded = true;
    },
    collapse() {
      this.expanded = false;
    },
    toggle() {
      this.expanded = !this.expanded;
    }
  }
};
</script>

<style lang="scss">
.collapsible-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  margin: 2px 0;

  .item-container {
    display: flex;
    flex-direction: row;
    padding: 2px 0;
    .item-controls {
      align-items: center;
      margin-top: auto;
      margin-bottom: auto;
    }
    .item-title {
      display: flex;
      flex-direction: row;
      align-items: center;
      cursor: pointer;
      flex: 1;
      min-width: 0px;
    }
  }
}
</style>
