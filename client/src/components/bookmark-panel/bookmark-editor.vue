<template>
  <dropdown-control
    class="bookmark-editor-dropdown"
  >
    <template #content>
      <div
        class="dropdown-option disabled"
        @click="editBookmark"
      >
        <i class="fa fa-edit" />
        Edit
      </div>
      <div
        class="dropdown-option"
        @click="deleteBookmark"
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
  name: 'BookmarkEditor',
  components: {
    DropdownControl
  },
  methods: {
    editBookmark() {
      this.$emit('edit');
    },
    deleteBookmark() {
      this.$emit('delete');
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";
.bookmark-editor-dropdown{
  position:absolute;
  right: 16px;
  width: fit-content;
}
</style>
