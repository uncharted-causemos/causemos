<template>
  <div class="dropdown-button-container">
    <button
      type="button"
      class="btn dropdown-btn"
      @click="isDropdownOpen = !isDropdownOpen"
    >
      <span>
        {{ innerButtonLabel ? `${innerButtonLabel}: ` : '' }}
        <strong>{{ selectedItem }}</strong>
      </span>
      <i class="fa fa-fw fa-angle-down" />
    </button>
    <dropdown-control v-if="isDropdownOpen" class="dropdown-control">
      <template #content>
        <div
          v-for="item in items"
          :key="item"
          class="dropdown-option"
          :class="{
            'dropdown-option-selected': selectedItem === item
          }"
          @click="emitItemSelection(item)"
        >
          {{ item }}
        </div>
      </template>
    </dropdown-control>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';
import DropdownControl from '@/components/dropdown-control.vue';

export default defineComponent({
  name: 'DropdownButton',
  components: {
    DropdownControl
  },
  props: {
    items: {
      type: Array as PropType<string[]>,
      default: []
    },
    selectedItem: {
      type: String as PropType<string | null>,
      default: null
    },
    innerButtonLabel: {
      type: String as PropType<string | null>,
      default: null
    }
  },
  emits: ['item-selected'],
  setup(props, { emit }) {
    const isDropdownOpen = ref(false);

    const emitItemSelection = (item: string | null) => {
      isDropdownOpen.value = false;
      emit('item-selected', item);
    };

    return {
      isDropdownOpen,
      emitItemSelection
    };
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.dropdown-button-container {
  position: relative;
}
.dropdown-control {
  position: absolute;
  right: 0;
  top: 90%; // Overlap the button slightly
  max-height: 400px;
  overflow-y: auto;
}
.dropdown-option-selected {
  color: $selected-dark;
}
.dropdown-btn {
  display: flex;
  align-items: center;
  font-weight: normal;
  padding: 5px;
  border: 1px solid gray;
}
</style>
