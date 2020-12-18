<template>
  <modal @close="close()">
    <div slot="header">
      <h4><i class="fa fa-upload" /> Upload Document</h4>
    </div>
    <div slot="body">
      <div>
        <form>
          <div class="form-group">
            <div class="instruction-set">
              <span> Instructions: </span><br>
              <span> 1. Click 'Choose File' and then select an .html, .csv, .doc or .pdf file of size less than 100MB. </span><br>
              <span> 2. Click 'Upload' to upload the file. </span>
            </div>
            <input
              ref="files"
              type="file"
              accept=".html, .csv, .doc, .pdf"
              class="form-control-file"
              @change="updateInputFile">
          </div>
          <div
            v-if="loading"
            class="upload-file-label">
            {{ sendStatus }}
          </div>
          <div
            v-if="!loading && !isFormEmpty"
            class="modal-information">
            <div class="form-group">
              <label>Title</label>
              <input
                v-model="formData.title.value"
                class="form-control form-control-sm"
                type="text"
                @input="validateTextField('title')">
              <div
                v-if="!formData.title.valid"
                class="invalid-message">
                {{ invalidInputMsg }}
              </div>
            </div>
            <div class="form-group">
              <label>Creation Date</label>
              <input
                v-model="formData.creationDate.value"
                class="form-control form-control-sm"
                type="date"
                @input="validateDateField('creationDate')">
              <div
                v-if="!formData.creationDate.valid"
                class="invalid-message">
                {{ invalidInputMsg }}
              </div>
            </div>
            <div class="form-group">
              <label>Author</label>
              <input
                v-model="formData.author.value"
                class="form-control form-control-sm"
                type="text"
                @input="validateTextField('author')">
              <div
                v-if="!formData.author.valid"
                class="invalid-message">
                {{ invalidInputMsg }}
              </div>
            </div>
            <div class="form-group">
              <label>Creator</label>
              <input
                v-model="formData.creator.value"
                class="form-control form-control-sm"
                type="text"
                @input="validateTextField('creator')">
              <div
                v-if="!formData.creator.valid"
                class="invalid-message">
                {{ invalidInputMsg }}
              </div>
            </div>
            <div class="form-group">
              <label>Publisher</label>
              <input
                v-model="formData.publisher.value"
                class="form-control form-control-sm"
                type="text"
                @input="validateTextField('publisher')">
              <div
                v-if="!formData.publisher.valid"
                class="invalid-message">
                {{ invalidInputMsg }}
              </div>
            </div>
            <div class="form-group">
              <label>Description</label>
              <input
                v-model="formData.description.value"
                class="form-control form-control-sm"
                type="text"
                @input="validateTextField('description')">
              <div
                v-if="!formData.description.valid"
                class="invalid-message">
                {{ invalidInputMsg }}
              </div>
            </div>
            <div class="form-group">
              <label>Extracted Text</label>
              <textarea
                v-model="formData.extractedText.value"
                class="form-control form-control-sm"
                @input="validateTextField('extractedText')" />
              <div
                v-if="!formData.extractedText.valid"
                class="invalid-message">
                {{ invalidInputMsg }}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    <div slot="footer">
      <button
        class="btn btn-light"
        @click.stop="close()"> Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        @click="onClickUpload">
        Extract Metadata
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="loading || !isFormValid"
        @click="onClickSend">
        Upload to DART
      </button>
    </div>
  </modal>
</template>


<script>
import _ from 'lodash';
import moment from 'moment';

import Modal from '@/components/modals/modal';
import API from '@/api/api';

/**
 * Modal that handles the uploading of documents
 **/
export default {
  name: 'ModalDocumentUpload',
  components: {
    Modal
  },
  data: () => ({
    formData: null,
    loading: false,
    sendStatus: 'Please upload a file.'
  }),
  computed: {
    isFormValid: function() {
      if (_.isEmpty(this.formData)) return false;
      return _.every(this.formData, { valid: true });
    },
    isFormEmpty: function() {
      return _.isEmpty(this.formData);
    }
  },
  created() {
    this.invalidInputMsg = 'Invalid input';
  },
  methods: {
    close() {
      this.$emit('close', null);
    },
    async onClickUpload() {
      // In this block of code we send the file provided by the html input to the server and display the resulting text in the text area.
      this.loading = true;
      this.sendStatus = 'Sending file. Please wait...';
      const formData = new FormData();
      formData.append('file', this.inputFile);
      try {
        const response = await API.post('docs/extract-metadata', formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        const metadata = JSON.parse(response.data);
        const docMetadata = metadata.extracted_metadata;
        const creationDate = docMetadata.CreationDate;
        let creationDateState = {
          value: null,
          valid: false
        };
        if (moment.utc(creationDate).isValid()) {
          creationDateState = {
            value: moment.utc(creationDate).format('YYYY-MM-DD'),
            valid: true
          };
        }
        // copy triagable fields and set valid status
        this.formData = {
          author: {
            value: docMetadata.Author,
            valid: this.validateString(docMetadata.Author)
          },
          publisher: {
            value: docMetadata.Publisher,
            valid: this.validateString(docMetadata.Publisher)
          },
          title: {
            value: docMetadata.Title,
            valid: this.validateString(docMetadata.Title)
          },
          description: {
            value: docMetadata.Description,
            valid: this.validateString(docMetadata.Description)
          },
          creator: {
            value: docMetadata.Creator,
            valid: this.validateString(docMetadata.Creator)
          },
          creationDate: creationDateState,
          extractedText: {
            value: metadata.extracted_text,
            valid: this.validateString(metadata.extracted_text)
          }
        };
        this.metadataResponse = _.cloneDeep(metadata);
      } catch (err) {
        this.sendStatus = 'Please upload a file.';
        console.error(err);
        this.toaster('An error occured while making the request. Please try again later.', 'error', true);
      }
      this.loading = false;
    },
    async onClickSend() {
      this.loading = true;
      this.sendStatus = 'Sending document meta. Please wait...';
      const extractedCdr = this.metadataResponse;
      const meta = this.formData;
      extractedCdr.extracted_metadata = Object.assign({
        Author: meta.author.value,
        Publisher: meta.publisher.value,
        Title: meta.title.value,
        Description: meta.description.value,
        CreationDate: meta.creationDate.value,
        Creator: meta.creator.value
      }, extractedCdr.extracted_metadata);
      extractedCdr.extracted_text = meta.extractedText.value;

      // FIXME: extracted_numeric will be optional future version of CDR - Feb 2020, currently is required
      if (_.isNil(extractedCdr.extracted_numeric)) {
        extractedCdr.extracted_numeric = {};
      }
      const formData = new FormData();
      formData.append('file', this.inputFile);
      formData.append('extracted_cdr', JSON.stringify(extractedCdr));

      try {
        await API.post('docs/submit', formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        this.toaster('Document metadata has been sent to DART pipeline.', 'success');
      } catch (err) {
        this.sendStatus = 'Please upload a file.';
        console.error(err);
        this.toaster('An error occured while making the request. Please try again later.', 'error', true);
      }
      this.loading = false;
    },
    validateDateField(field) {
      this.formData[field].valid = moment.utc(this.formData[field].value).isValid();
    },
    validateTextField(field) {
      this.formData[field].valid = this.validateString(this.formData[field].value);
    },
    validateString(str) {
      return !_.isNil(str) && str !== '';
    },
    updateInputFile(evt) {
      this.inputFile = evt.target.files[0];
      this.formData = null;
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/wm-theme/wm-theme";

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
      .modal-information {
        display: flex;
        flex-direction: column;
        .invalid-message {
          color: $state-danger-text;
        }
        textarea {
          width: 100%;
          height: 290px;
          resize: none;
        }
      }
    }
    width: 50vw;
    display: flex;
    flex-direction: column;
    height: 85vh;
  }
</style>
