<template>
  <modal
    :use-green-header="true"
    @close="close()">
    <template #header>
      <h4> <div>Retain existing parameterisation</div> </h4>
    </template>
    <template #body>
      The CAG you are trying to import has conflicting parameters (indicators). If you want to retain your existing parameterisation data
      click <strong>Retain</strong>, otherwise click <strong>Overwrite</strong> to overwrite with imported configurations.
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn first-button"
          @click.stop="overwrite()">Overwrite
        </button>
        <button
          type="button"
          class="btn btn-primary btn-call-for-action"
          @click.stop="retain()">Retain
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
  methods: {
    close() {
      this.$emit('close', null);
    },
    overwrite() {
      this.$emit('overwrite', null);
    },
    retain() {
      this.$emit('retain', null);
    }
  }
};
</script>

<style scoped lang="scss">
.first-button {
  margin-right: 10px;
}

</style>
