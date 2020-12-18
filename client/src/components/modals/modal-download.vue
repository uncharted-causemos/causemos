<template>
  <modal @close="close()">
    <div slot="header">
      <h4><i class="fa fa-send" /> Download Model</h4>
    </div>
    <div slot="body">
      <span>File name: <input v-model="saveName"></span>
    </div>
    <div slot="footer">
      <button
        type="button"
        class="btn btn-link"
        @click.stop="close()">Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :class="{ 'disabled': saveName.length === 0}"
        @click.stop="download()">Download (json)
      </button>
    </div>
  </modal>
</template>

<script>

import _ from 'lodash';
import { mapGetters } from 'vuex';
import API from '@/api/api';
import Modal from '@/components/modals/modal';

export default {
  name: 'ModalDownload',
  components: {
    Modal
  },
  props: {
    model: {
      type: Object,
      default: () => {}
    }
  },
  data: () => ({
    saveName: ''
  }),
  computed: {
    ...mapGetters({
      collection: 'app/collection'
    })
  },
  methods: {
    close() {
      this.$emit('close', null);
    },
    validate() {
      if (_.isEmpty(this.saveName)) {
        return false;
      }
      return true;
    },
    download() {
      if (!this.validate()) return;

      API.post(`collections/${this.collection}/models/${this.model.id}/export`).then((response) => {
        const data = JSON.stringify(response.data);
        const blob = new Blob([data], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${this.saveName}.json`);
        document.body.appendChild(link);
        link.click();
        this.close();
      });
    }
  }
};
</script>

<style scoped lang="scss">
</style>
