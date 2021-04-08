<template>
  <modal @close="close()">
    <template #header>
      <h4><i class="fa fa-fw fa-book" /> Readers status</h4>
    </template>
    <template #body>
      <table class="table">
        <tr
          v-for="(item, idx) in readersStatus"
          :key="idx">
          <td>{{ item.identity }}</td>
          <td>{{ item.version }}</td>
          <td>{{ item.document_id }}</td>
          <td>{{ item.storage_key }}</td>
        </tr>
      </table>
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn first-button"
          @click.stop="close()">Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-call-for-action"
          @click.stop="add()">Add to Project
        </button>
      </ul>
    </template>
  </modal>
</template>

<script>
import { defineComponent } from 'vue';
import Modal from '@/components/modals/modal.vue';
import dartService from '@/services/dart-service';

export default defineComponent({
  name: 'ModalReadersStatus',
  components: {
    Modal
  },
  emits: [
    'close'
  ],
  data: () => ({
    readersStatus: []
  }),
  mounted() {
    dartService.getReadersStatus(0).then(data => {
      this.readersStatus = data;
      console.log('aaaa', this.readersStatus);
    });
  },
  methods: {
    close() {
      this.$emit('close');
    }
  }
});
</script>

<style lang="scss" scoped>
</style>


