<template>
  <div class="sortable-table-header-cell-container">
    <span>{{ props.label }}</span>
    <div class="carets">
      <i
        class="fa fa-caret-up"
        :class="[activeState === SortableTableHeaderState.Up ? 'active' : '']"
      />
      <i
        class="fa fa-caret-down"
        :class="[activeState === SortableTableHeaderState.Down ? 'active' : '']"
      />
    </div>
    <dropdown-control class="dropdown-control">
      <template #content>
        <div
          class="dropdown-option"
          :class="[activeState === SortableTableHeaderState.Up ? 'active' : '']"
          @click="emit('set-sort', SortableTableHeaderState.Up)"
        >
          <i class="fa fa-caret-up" />
          {{ upLabel }}
        </div>
        <div
          class="dropdown-option"
          :class="[activeState === SortableTableHeaderState.Down ? 'active' : '']"
          @click="emit('set-sort', SortableTableHeaderState.Down)"
        >
          <i class="fa fa-caret-down" />
          {{ downLabel }}
        </div>
      </template>
    </dropdown-control>
  </div>
</template>

<script setup lang="ts">
import DropdownControl from '../dropdown-control.vue';
import { SortableTableHeaderState } from '@/types/Enums';

const props = defineProps<{
  label: string;
  activeState: SortableTableHeaderState;
  upLabel: string;
  downLabel: string;
}>();

const emit = defineEmits<{
  (e: 'set-sort', state: SortableTableHeaderState): void;
}>();
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';

.sortable-table-header-cell-container {
  $horizontal-padding: 10px;
  display: flex;
  gap: 5px;
  padding: 2px $horizontal-padding;
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  // Nudge the contents of the cell to the left by the horizontal padding amount so that the label
  //  is aligned with the left edge of the column
  left: -$horizontal-padding;

  span {
    color: $subdued;
  }

  .carets {
    display: none;
  }

  .dropdown-control {
    display: none;
  }
}

.sortable-table-header-cell-container:hover {
  background: $un-color-black-5;

  span {
    color: black;
  }

  .dropdown-control {
    display: block;
  }
}

.carets {
  position: relative;
  height: 100%;
  width: 15px;

  // If one of the carets is active, display both carets at all times
  &:has(.active) {
    display: block;
  }

  i {
    position: absolute;
    font-size: 1.25rem;
    width: 100%;
    text-align: center;
    color: $subdued;

    &.active {
      color: black;
      opacity: 1;
    }

    &.active + i,
    &:has(+ .active) {
      color: $un-color-black-30;
      opacity: 1;
    }
  }

  & > *:first-child {
    top: 0;
  }

  & > *:last-child {
    bottom: 0;
  }
}
.dropdown-control {
  position: absolute;
  left: 0;
  top: 100%; // Overlap the button slightly
  width: fit-content;

  .dropdown-option {
    white-space: nowrap;

    i {
      margin-right: 5px;
    }

    &.active {
      color: $selected-dark;
      background: $accent-lightest;
    }
  }
}
</style>
