<template>
  <modal
    :use-green-header="true"
    @close="close()">
    <template #header>
      <h4><slot name="title" /></h4>
    </template>
    <template #body>
      <slot name="message" />
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn first-button"
          @click.stop="close()">Cancel
        </button>
        <button
          ref="confirm"
          type="button"
          class="btn btn-primary btn-call-for-action"
          @click.stop="confirm()">Confirm
        </button>
      </ul>
    </template>
  </modal>
</template>

<script>

import Modal from '@/components/modals/modal';

export default {
  name: 'ModalConfirm',
  components: {
    Modal
  },
  props: {
    autofocusConfirm: {
      type: Boolean,
      default: true
    }
  },
  emits: [
    'confirm', 'close'
  ],
  mounted() {
    if (this.autofocusConfirm) this.$refs.confirm.focus();
  },
  methods: {
    close() {
      this.$emit('close', null);
    },
    confirm() {
      this.$emit('confirm', null);
    }
  }
};
</script>

<style scoped lang="scss">

.first-button {
  margin-right: 10px;
}

</style>
