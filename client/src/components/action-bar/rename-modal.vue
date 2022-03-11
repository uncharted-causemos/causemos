<template>
  <modal-confirmation
    :autofocus-confirm="false"
    @confirm="onConfirm"
    @close="onCancel"
  >
    <template #title>{{ modalTitle }}</template>
    <template #message>
      <input
        v-focus
        type="text"
        class="form-control"
        :value="currentName"
        @focus="$event.target.select()"
        @input="newNameInput = $event.target.value"
        @keyup.enter="onConfirm"
      >
    </template>
  </modal-confirmation>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ModalConfirmation from '@/components/modals/modal-confirmation.vue';

export default defineComponent({
  name: 'RenameModal',
  components: {
    ModalConfirmation
  },
  props: {
    modalTitle: {
      type: String,
      default: 'Rename Model'
    },
    currentName: {
      type: String,
      default: ''
    }
  },
  emits: ['confirm', 'cancel'],
  data: () => ({
    newNameInput: ''
  }),
  methods: {
    onConfirm() {
      if (this.newNameInput) {
        this.$emit('confirm', this.newNameInput.trim());
      }
    },
    onCancel() {
      this.newNameInput = '';
      this.$emit('cancel');
    }
  }
});
</script>
