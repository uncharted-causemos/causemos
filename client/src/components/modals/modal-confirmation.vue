<template>
  <modal @close="close()">
    <template #header>
      <h4><slot name="title" /></h4>
    </template>
    <template #body>
      <slot name="message" />
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button type="button" class="btn btn-default" @click.stop="close()">Cancel</button>
        <button
          ref="confirm"
          type="button"
          class="btn btn-default btn-call-to-action"
          @click.stop="confirm()"
        >
          Confirm
        </button>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Modal from '@/components/modals/modal.vue';

export default defineComponent({
  name: 'ModalConfirm',
  components: {
    Modal,
  },
  props: {
    autofocusConfirm: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['confirm', 'close'],
  mounted() {
    if (this.autofocusConfirm) {
      const el = this.$refs.confirm as HTMLButtonElement;
      el.focus();
    }
  },
  methods: {
    close() {
      this.$emit('close', null);
    },
    confirm() {
      this.$emit('confirm', null);
    },
  },
});
</script>

<style scoped lang="scss">
@import '@/styles/common';
@import '@/styles/uncharted-design-tokens';
</style>
