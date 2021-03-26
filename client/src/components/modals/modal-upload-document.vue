<template>
  <modal @close="close()">
    <template #header>
      <h4><i class="fa fa-upload" /> Upload Document</h4>
    </template>
    <template #body>
      <div>
        <form>
          <div class="form-group">
            <div class="instruction-set">
              <span> Instructions: </span><br>
              <span> 1. Click 'Choose File' and then select an .html, .csv, .doc or .pdf file of size less than 100MB. </span><br>
              <span> 2. Fill in relevant metadata information. </span><br>
              <span> 3. Click 'Upload' to upload the file. </span>
            </div>
            <input
              ref="files"
              type="file"
              accept=".html, .csv, .doc, .pdf"
              class="form-control-file"
              @change="updateInputFile">
            <div class="form-group">
              <div>Genre</div>
              <input
                v-model="metadataGenre"
                class="form-control form-control-sm"
                type="text">

              <div>Tags, provide a list of comma-delimited keywords relating to the document</div>
              <input
                v-model="metadataLabels"
                class="form-control form-control-sm"
                placeholder="e.g. conflict, food security, planting season"
                type="text">
            </div>
          </div>
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

  /deep/ .modal-container {

    .modal-header {
      height: 50px;
    }
    .modal-footer {
      height: 50px;
    }
    .modal-body {
      flex-grow: 1;
      overflow-y: auto;
      .instruction-set {
        padding: 10px 0px;
      }
      .upload-file-label {
        padding-bottom: 10px;
      }
    }
    width: 50vw;
    display: flex;
    flex-direction: column;
  }
</style>
