<template>
  <div class="collapsible-list-header-container">
    <div class="bulk-actions">
      <slot />
    </div>
    <div class="expand-collapse">
      <small-text-button :label="'Expand All'" @click="$emit('expand-all')" />
      <small-text-button :label="'Collapse All'" @click="$emit('collapse-all')" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import SmallTextButton from '@/components/widgets/small-text-button.vue';
export default defineComponent({
  components: { SmallTextButton },
  name: 'CollapsibleListHeader',
  emits: ['expand-all', 'collapse-all'],
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.collapsible-list-header-container {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid $separator;
}

:deep(.bulk-actions) {
  display: flex;
  align-items: center;

  & > * {
    margin-right: 8px;
  }

  & > i:first-child {
    // HACK: Checkbox icon has extra horizontal spacing,
    //  causing unequal padding between controls
    margin-right: 4px;
  }
}

.expand-collapse:only-child {
  // Right-align expand/collapse buttons when
  // bulk edit options aren't shown
  margin-left: auto;
}
.expand-collapse button:first-child {
  margin-right: 8px;
}
</style>
