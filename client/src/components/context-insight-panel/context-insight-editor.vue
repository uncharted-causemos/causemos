<template>
  <dropdown-control
    class="context-insight-editor-dropdown"
  >
    <template #content>
      <div
        class="dropdown-option disabled"
        @click="editContextInsight"
      >
        <i class="fa fa-edit" />
        Edit
      </div>
      <div
        class="dropdown-option"
        @click="deleteContextInsight"
      >
        <i class="fa fa-trash" />
        Delete
      </div>
    </template>
  </dropdown-control>
</template>

<script>
import DropdownControl from '@/components/dropdown-control';

// FIXME: refactor with insight-editor as one reusable component
export default {
  name: 'ContextInsightEditor',
  components: {
    DropdownControl
  },
  methods: {
    editContextInsight() {
      this.$emit('edit');
    },
    deleteContextInsight() {
      this.$emit('delete');
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";
.context-insight-editor-dropdown{
  position:absolute;
  right: 16px;
  width: fit-content;
}
</style>
