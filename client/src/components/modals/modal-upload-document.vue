<template>
  <modal @close="close()">
    <template #header>
      <h4><i class="fa fa-upload" /> Add Documents</h4>
    </template>
    <template #body>
      <div>
        <p>
        Based on the numbers and sizes of documents, it may 10 to 20 minutes to process, assemble,
        and ingest into the project.
        </p>
        <form>
          <input
            ref="files"
            multiple
            type="file"
            accept=".html, .csv, .doc, .pdf, .txt"
            class="form-control-file"
            @change="updateInputFile">
          <p class="instruction-set">.html, .csv, .doc, .pdf, or .txt (max. 100MB total) </p>
          <div v-if="inputFile">
            <table class="table table-condensed table-bordered">
              <tbody>
                <tr v-for="(f, i) of inputFile" :key="i">
                  <td>{{ f.name }}</td>
                  <td>{{ toMB(f.size) }}</td>
                </tr>
              </tbody>
            </table>
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

<script lang="ts">
import _ from 'lodash';
import { useStore } from 'vuex';
import { defineComponent, ref, computed } from 'vue';
import dartService from '@/services/dart-service';
import Modal from '@/components/modals/modal.vue';
import useToaster from '@/services/composables/useToaster';
import { TYPE } from 'vue-toastification';

const MB = 1024 * 1024;

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
    const store = useStore();
    const inputFile = ref(null as any);

    return {
      loading: ref(false),
      metadataLabels: ref(''), // not used
      metadataGenre: ref(''), // not used
      sendStatus: ref('Please upload a file.'),
      inputFile,

      isValid: computed(() => !_.isNil(inputFile.value)),
      project: computed(() => store.getters['app/project']),

      toMB: (v: number) => {
        return (v / MB).toFixed(2) + 'MB';
      },
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
      const names = [];
      const formData = new FormData();
      for (let i = 0; i < this.inputFile.length; i++) {
        formData.append('file', this.inputFile[i]);
        names.push(this.inputFile[i].name);
      }
      formData.append('metadata', JSON.stringify({
        genre: this.metadataGenre,
        labels: this.metadataLabels.split(',')
      }));
      formData.append('project', this.project);

      // TODO: save project to  doc_id mapping
      await dartService.uploadDocument(formData);
      this.toaster(`Successfully uploaded ${names.join(', ')} for processing`, TYPE.SUCCESS, false);
      this.loading = false;
      this.metadataGenre = '';
      this.metadataLabels = '';
      this.inputFile = null;
    },
    updateInputFile(evt: Event) {
      const el = evt.target as HTMLInputElement;
      if (el && el.files) {
        // this.inputFile = el.files[0];
        this.inputFile = el.files;
      }
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

:deep(.modal-container) {

  .modal-header {
    height: 50px;
  }
  .modal-body {
    flex-grow: 1;
    max-height: 70vh;
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
