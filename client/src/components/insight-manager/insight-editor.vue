<template>
  <dropdown-control
    class="insight-editor-dropdown"
  >
    <template #content>
      <div
        class="dropdown-option disabled"
        @click="editInsight"
      >
        <i class="fa fa-edit" />
        Edit
      </div>
      <div
        class="dropdown-option"
        @click="deleteInsight"
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
  name: 'InsightEditor',
  components: {
    DropdownControl
  },
  methods: {
    editInsight() {
      this.$emit('edit');
    },
    deleteInsight() {
      this.$emit('delete');
    }
  }
});
</script>

<style lang="scss" scoped>
.insight-editor-dropdown{
  position: absolute;
  right: 0px;
  bottom: 32px;
  width: fit-content;
}
</style>
