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
          <p class="instruction-set">.html, .csv, .doc, .pdf, or .txt (max. 100MB) </p>
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

<script lang="ts">
import _ from 'lodash';
import { defineComponent, ref, computed } from 'vue';
import dartService from '@/services/dart-service';
import Modal from '@/components/modals/modal.vue';
import useToaster from '@/services/composables/useToaster';

/**
 * Modal that handles the uploading of documents
 **/
export default defineComponent({
  name: 'ModalDocumentUpload',
  components: {
    Modal
  },
  emits: [
    'close'
  ],
  setup() {
    const inputFile = ref(null as any);
    return {
      loading: ref(false),
      metadataLabels: ref(''), // not used
      metadataGenre: ref(''), // not used
      sendStatus: ref('Please upload a file.'),
      inputFile,
      isValid: computed(() => !_.isNil(inputFile.value)),

      toaster: useToaster()
    };
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
    updateInputFile(evt: Event) {
      const el = evt.target as HTMLInputElement;
      if (el && el.files) {
        this.inputFile = el.files[0];
      }
    }
  }
});
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
    width: 100%;
  }
}

.instruction-set {
  color: $label-color;
}
</style>
