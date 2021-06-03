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

<script lang="ts">
import { defineComponent } from 'vue';
import DropdownControl from '@/components/dropdown-control.vue';

export default defineComponent({
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
});
</script>

<style lang="scss" scoped>
.bookmark-editor-dropdown{
  position: absolute;
  right: 0px;
  bottom: 32px;
  width: fit-content;
}
</style>
