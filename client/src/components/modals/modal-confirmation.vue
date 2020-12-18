<template>
  <modal
    :use-green-header="true"
    @close="close()"
  >
    <h4 slot="header">
      <slot name="title" />
    </h4>
    <div slot="body">
      <slot name="message" />
    </div>
    <ul
      slot="footer"
      class="unstyled-list"
    >
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
