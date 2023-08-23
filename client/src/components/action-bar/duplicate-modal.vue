<template>
  <modal-confirmation :autofocus-confirm="false" @confirm="onConfirm" @close="onCancel">
    <template #title>{{ modalTitle }}</template>
    <template #message>
      <input
        v-focus
        type="text"
        class="form-control"
        :value="currentName"
        @focus="focusEvent => (focusEvent.target as any | null)?.select()"
        @input="event => newNameInput = (event.target as any | null)?.value "
        @keyup.enter="onConfirm"
      />
    </template>
  </modal-confirmation>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ModalConfirmation from '@/components/modals/modal-confirmation.vue';

export default defineComponent({
  name: 'DuplicateModal',
  components: {
    ModalConfirmation,
  },
  props: {
    modalTitle: {
      type: String,
      default: 'Duplicate Analysis',
    },
    currentName: {
      type: String,
      default: '',
    },
  },
  emits: ['confirm', 'cancel'],
  data: () => ({
    newNameInput: '',
  }),
  methods: {
    onConfirm() {
      this.$emit('confirm', this.newNameInput || this.currentName);
    },
    onCancel() {
      this.newNameInput = '';
      this.$emit('cancel');
    },
  },
});
</script>
