<template>
  <div class="dropdown-button-container" ref="containerElement">
    <button type="button" class="btn dropdown-btn" @click="isDropdownOpen = !isDropdownOpen">
      <span>
        {{ innerButtonLabel ? `${innerButtonLabel}: ` : '' }}
        <strong :style="hasColorOverride ? { color: getColorOverride(selectedItem) } : {}">{{
          selectedItemDisplayName
        }}</strong>
      </span>
      <i class="fa fa-fw fa-angle-down" />
    </button>
    <dropdown-control
      v-if="isDropdownOpen"
      class="dropdown-control"
      :class="{
        'left-aligned': isDropdownLeftAligned,
        above: isDropdownAbove,
      }"
    >
      <template #content>
        <div
          v-for="item in dropdownItems"
          :style="hasColorOverride ? { color: getColorOverride(item.value) } : {}"
          :key="item"
          class="dropdown-option"
          :class="{
            'dropdown-option-selected': isSelectedItem(item.value),
          }"
          @click="emitItemSelection(item.value)"
        >
          {{ item.displayName }}
          <i v-if="item.selected" style="margin-left: 1rem" class="fa fa-check fa-lg" />
        </div>
      </template>
    </dropdown-control>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs, watchEffect } from 'vue';
import DropdownControl from '@/components/dropdown-control.vue';
import _ from 'lodash';

export interface DropdownItem {
  displayName: string;
  value: any;
  selected?: boolean;
  color?: string;
}

const DEFAULT_TEXT_COLOR = 'black';

export default defineComponent({
  name: 'DropdownButton',
  components: {
    DropdownControl,
  },
  props: {
    items: {
      type: Array as PropType<(string | DropdownItem)[]>,
      default: [],
    },
    selectedItem: {
      default: null as any,
    },
    innerButtonLabel: {
      type: String as PropType<string | null>,
      default: null,
    },
    isDropdownLeftAligned: {
      type: Boolean,
      default: false,
    },
    isDropdownAbove: {
      type: Boolean,
      default: false,
    },
    // the following two props are added to enable multi-select mode
    isMultiSelect: {
      type: Boolean,
      default: false,
    },
    selectedItems: {
      type: Array as PropType<string[]>,
      default: [],
    },
  },
  emits: ['item-selected', 'items-selected'],
  setup(props, { emit }) {
    const { items, selectedItem, isMultiSelect, selectedItems } = toRefs(props);

    const isDropdownOpen = ref(false);
    const containerElement = ref<HTMLElement | null>(null);

    const onClickOutside = (event: MouseEvent) => {
      if (event.target instanceof Element && containerElement.value?.contains(event.target)) {
        // Click was within this element, so do nothing
        return;
      }
      isDropdownOpen.value = false;
    };

    const hasColorOverride = computed<boolean>(() => {
      if (props.items.length > 0 && typeof props.items[0] !== 'string') {
        const item: DropdownItem = props.items[0];
        return 'color' in item;
      }
      return false;
    });

    const getColorOverride = (selected: boolean) => {
      let color = DEFAULT_TEXT_COLOR;
      props.items.forEach((item) => {
        if (typeof item !== 'string' && 'color' in item && item.value === selected) {
          color = item.color ?? DEFAULT_TEXT_COLOR;
        }
      });
      return color;
    };

    watchEffect(() => {
      if (isDropdownOpen.value) {
        window.document.addEventListener('click', onClickOutside);
      } else {
        window.document.removeEventListener('click', onClickOutside);
      }
    });

    // This component can accept a list of strings or a list of DropdownItems.
    //  This computed property standardizes by converting strings to DropdownItems.
    const dropdownItems = computed<DropdownItem[]>(() => {
      const standardizedDropdownItems = items.value.map((item) =>
        typeof item === 'string' ? { displayName: item, value: item } : item
      );
      if (isMultiSelect.value) {
        standardizedDropdownItems.forEach((dropdownItem) => {
          dropdownItem.selected = selectedItems.value.includes(dropdownItem.value);
        });
      }
      return standardizedDropdownItems;
    });

    const selectedItemDisplayName = computed(() => {
      return isMultiSelect.value && selectedItems.value.length > 0
        ? selectedItems.value.length > 1
          ? '(multiple)'
          : selectedItems.value[0]
        : dropdownItems.value.find((item) => item.value === selectedItem.value)?.displayName ??
            selectedItem.value;
    });

    const emitItemSelection = (item: any) => {
      if (!isMultiSelect.value) {
        isDropdownOpen.value = false;
        emit('item-selected', item);
      } else {
        // keep the dropdown menu open in the mode if multi-select, and emit all selected
        const updatedDropdownItems = _.cloneDeep(dropdownItems);
        const itemToUpdate = updatedDropdownItems.value.find((i) => i.value === item);
        if (itemToUpdate) {
          itemToUpdate.selected = !itemToUpdate.selected;
        }
        emit(
          'items-selected',
          updatedDropdownItems.value.filter((item) => item.selected).map((item) => item.value)
        );
      }
    };

    const isSelectedItem = (item: any) => {
      return isMultiSelect.value ? selectedItems.value.includes(item) : selectedItem === item;
    };

    return {
      isDropdownOpen,
      emitItemSelection,
      dropdownItems,
      selectedItemDisplayName,
      containerElement,
      isSelectedItem,
      getColorOverride,
      hasColorOverride,
    };
  },
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

  &.left-aligned {
    left: 0;
    right: auto;
  }
  &.above {
    bottom: 90%;
    top: auto;
  }
}
.dropdown-option {
  white-space: nowrap;
}
.dropdown-option-selected {
  color: $selected-dark;
}
.dropdown-btn {
  display: flex;
  align-items: center;
  font-weight: normal;
  padding: 5px;
}
</style>
