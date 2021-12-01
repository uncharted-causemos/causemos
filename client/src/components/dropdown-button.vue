<template>
  <div class="dropdown-button-container" ref="containerElement">
    <button
      type="button"
      class="btn btn-default dropdown-btn"
      @click="isDropdownOpen = !isDropdownOpen"
    >
      <span>
        {{ innerButtonLabel ? `${innerButtonLabel}: ` : '' }}
        <strong>{{ selectedItemDisplayName }}</strong>
      </span>
      <i class="fa fa-fw fa-angle-down" />
    </button>
    <dropdown-control
      v-if="isDropdownOpen"
      class="dropdown-control"
      :class="{
        'left-aligned': isDropdownLeftAligned,
        'above': isDropdownAbove
      }"
    >
      <template #content>
        <div
          v-for="item in dropdownItems"
          :key="item"
          class="dropdown-option"
          :class="{
            'dropdown-option-selected': selectedItem === item.value
          }"
          @click="emitItemSelection(item.value)"
        >
          {{ item.displayName }}
        </div>
      </template>
    </dropdown-control>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  PropType,
  ref,
  toRefs,
  watchEffect
} from 'vue';
import DropdownControl from '@/components/dropdown-control.vue';

export interface DropdownItem {
  displayName: string;
  value: any;
}

export default defineComponent({
  name: 'DropdownButton',
  components: {
    DropdownControl
  },
  props: {
    items: {
      type: Array as PropType<(string | DropdownItem)[]>,
      default: []
    },
    selectedItem: {
      default: null as any
    },
    innerButtonLabel: {
      type: String as PropType<string | null>,
      default: null
    },
    isDropdownLeftAligned: {
      type: Boolean,
      default: false
    },
    isDropdownAbove: {
      type: Boolean,
      default: false
    }
  },
  emits: ['item-selected'],
  setup(props, { emit }) {
    const { items, selectedItem } = toRefs(props);

    const isDropdownOpen = ref(false);
    const containerElement = ref<HTMLElement | null>(null);

    const onClickOutside = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        containerElement.value?.contains(event.target)
      ) {
        // Click was within this element, so do nothing
        return;
      }
      isDropdownOpen.value = false;
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
    const dropdownItems = computed<DropdownItem[]>(() =>
      items.value.map(item =>
        typeof item === 'string' ? { displayName: item, value: item } : item
      )
    );

    const selectedItemDisplayName = computed(() => {
      return (
        dropdownItems.value.find(item => item.value === selectedItem.value)
          ?.displayName ?? selectedItem.value
      );
    });

    const emitItemSelection = (item: any) => {
      isDropdownOpen.value = false;
      emit('item-selected', item);
    };

    return {
      isDropdownOpen,
      emitItemSelection,
      dropdownItems,
      selectedItemDisplayName,
      containerElement
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
