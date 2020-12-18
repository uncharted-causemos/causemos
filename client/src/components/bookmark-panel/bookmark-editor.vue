<template>
  <dropdown-control
    class="bookmark-editor-dropdown"
  >
    <div slot="content">
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
    </div>
  </dropdown-control>
</template>

<script>
import DropdownControl from '@/components/dropdown-control';

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
  right: 25px;
  width: 20vh;
}
</style>
