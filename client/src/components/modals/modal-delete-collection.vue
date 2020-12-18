<template>
  <modal @close="close()">
    <div slot="header">
      <h4>Delete {{ model.type }}</h4>
    </div>
    <div slot="body">
      <p>Are you sure you want to delete <strong>{{ model.name }}</strong> and all associated models/subgraphs?</p>
      <div
        class="alert alert-warning"
        role="alert">
        Warning: This action cannot be undone.
      </div>
    </div>
    <div slot="footer">
      <button
        type="button"
        class="btn btn-link"
        @click="close()">
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        @click="deleteCollection">
        Confirm
      </button>
    </div>
  </modal>
</template>

<script>
import _ from 'lodash';
import Modal from '@/components/modals/modal';

/**
 * This is the confirmation dialog for removing knowledge bases, projects and models.
 * It just handles the confirmation, it is up to the parent component to handle the actual
 * deletion process.
 */
export default {
  name: 'ModalDeleteCollection',
  components: {
    Modal
  },
  props: {
    model: {
      type: Object,
      default: () => ({})
    }
  },
  methods: {
    deleteCollection() {
      if (_.isEmpty(this.model)) return;
      this.$emit('confirm', this.model);
    },
    close() {
      this.$emit('close', null);
    }
  }
};
</script>
