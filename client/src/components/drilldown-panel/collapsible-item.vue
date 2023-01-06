<template>
  <div class="collapsible-container">
    <div class="item-container">
      <div class="item-controls">
        <slot name="controls" />
      </div>
      <div class="item-title" @click="toggleIsExpanded">
        <i
          :class="{
            'fa fa-angle-down fa-fw': isExpanded,
            'fa fa-angle-right fa-fw': !isExpanded,
          }"
        />
        <slot name="title" />
      </div>
    </div>
    <div v-if="isExpanded">
      <slot name="content" />
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent, onMounted, PropType, ref, toRefs, watch } from 'vue';

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
export default defineComponent({
  name: 'CollapsibleItem',
  props: {
    override: {
      type: Object as PropType<{ value: boolean }>,
      default: null,
    },
    defaultExpand: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { override, defaultExpand } = toRefs(props);
    const isExpanded = ref(false);

    onMounted(() => {
      if (!_.isNil(override.value)) {
        isExpanded.value = override.value.value;
      } else if (defaultExpand) {
        isExpanded.value = true;
      }
    });

    // Whenever the override value is set by a parent
    //  component, reset isExpanded to that value.
    watch(
      () => override.value,
      () => {
        const newValue = override.value;
        if (!_.isNil(newValue)) {
          isExpanded.value = newValue.value;
        }
      }
    );

    const toggleIsExpanded = () => {
      isExpanded.value = !isExpanded.value;
    };

    return {
      isExpanded,
      toggleIsExpanded,
    };
  },
});
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
