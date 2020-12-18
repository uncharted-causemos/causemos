<template>
  <modal-confirmation
    :autofocus-confirm="false"
    @confirm="onConfirm"
    @close="onCancel"
  >
    <div slot="title">{{ modalTitle }}</div>
    <div slot="message">
      <input
        v-focus
        type="text"
        class="form-control"
        :value="currentName"
        @focus="$event.target.select()"
        @input="newNameInput = $event.target.value"
        @keyup.enter="onConfirm"
      >
    </div>
  </modal-confirmation>
</template>

<script>
import ModalConfirmation from '@/components/modals/modal-confirmation';

export default {
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
  data: () => ({
    newNameInput: ''
  }),
  methods: {
    onConfirm() {
      this.$emit('confirm', this.newNameInput || this.currentName);
    },
    onCancel() {
      this.newNameInput = '';
      this.$emit('cancel');
    }
  }
};
</script>
