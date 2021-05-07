<template>
  <modal @close="close()">
    <template #header>
      <h4><i class="fa fa-upload" /> Upload Document</h4>
    </template>
    <template #body>
      <div>
        <form>
          <input
            ref="files"
            type="file"
            accept=".html, .csv, .doc, .pdf, .txt"
            class="form-control-file"
            @change="updateInputFile">
          <span class="instruction-set">.html, .csv, .doc, .pdf, .txt, or zip (max. 100MB) </span>
          <div
            v-if="loading"
            class="upload-file-label">
            {{ sendStatus }}
          </div>
        </form>
      </div>
    </template>
    <template #footer>
      <button
        class="btn btn-light"
        @click.stop="close()"> Close
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="loading || !isValid"
        @click="onClickUpload">
        Upload
      </button>
    </template>
  </modal>
</template>

<script>
import _ from 'lodash';
import dartService from '@/services/dart-service';
import Modal from '@/components/modals/modal';

/**
 * Modal that handles the uploading of documents
 **/
export default {
  name: 'ModalDocumentUpload',
  components: {
    Modal
  },
  emits: [
    'close'
  ],
  data: () => ({
    loading: false,
    sendStatus: 'Please upload a file.',
    metadataLabels: '',
    metadataGenre: '',
    inputFile: null
  }),
  computed: {
    isValid: function() {
      return !_.isNil(this.inputFile);
    }
  },
  methods: {
    close() {
      this.$emit('close', null);
    },
    async onClickUpload() {
      this.loading = true;
      this.sendStatus = 'Sending file. Please wait...';
      const formData = new FormData();
      formData.append('file', this.inputFile);
      formData.append('metadata', JSON.stringify({
        genre: this.metadataGenre,
        labels: this.metadataLabels.split(',')
      }));

      // TODO: save project to  doc_id mapping
      await dartService.uploadDocument(formData);
      this.toaster(`Successfully uploaded ${this.inputFile.name}. Please see <page> to view reader status and to start knowledge reassembly`, 'success', false);
      this.loading = false;
      this.metadataGenre = '';
      this.metadataLabels = '';
      this.inputFile = null;
    },
    updateInputFile(evt) {
      this.inputFile = evt.target.files[0];
    }
  }
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

::v-deep(.modal-container) {

  .modal-header {
    height: 50px;
  }
  .modal-body {
    flex-grow: 1;
    overflow-y: auto;
    .upload-file-label {
      padding-bottom: 10px;
    }
  }
  width: 50vw;
  display: flex;
  flex-direction: column;
}

form {
  input {
    display: inline-block;
  }
  span {
    color: $label-color;
  }
}
</style>
