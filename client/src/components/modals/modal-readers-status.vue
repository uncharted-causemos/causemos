<template>
  <modal @close="close()">
    <template #header>
      <h4><i class="fa fa-fw fa-book" /> Readers status</h4>
    </template>
    <template #body>
      <table class="table">
        <tr>
          <td>&nbsp;</td>
          <td>Eidos</td>
          <td>Hume</td>
          <td>Sofia</td>
        </tr>
        <tr
          v-for="(item, idx) in readersStatus"
          :key="idx">
          <td>{{ item.document_id}}</td>
          <td>
            <i v-if="item.eidos" class="fa fa-fw fa-check" />
            <i v-if="!item.eidos" class="fa fa-fw fa-spinner" />
          </td>
          <td>
            <i v-if="item.hume" class="fa fa-fw fa-check" />
            <i v-if="!item.hume" class="fa fa-fw fa-spinner" />
          </td>
          <td>
            <i v-if="item.sofia" class="fa fa-fw fa-check" />
            <i v-if="!item.sofia" class="fa fa-fw fa-spinner" />
          </td>
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
          :disabled="readersStatus.length == 0"
          @click.stop="addToProject()">Add to Project
        </button>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent } from 'vue';
import { mapGetters } from 'vuex';
import Modal from '@/components/modals/modal.vue';
import projectService from '@/services/project-service';
import { getReadersStatus } from '@/services/dart-service';
import { ReaderOutputRecord } from '@/types/Dart';

enum Readers {
  EIDOS = 'eidos',
  SOFIA = 'sofia',
  HUME = 'hume'
}

interface GroupedRecord {
  document_id: string;
  eidos?: ReaderOutputRecord;
  hume?: ReaderOutputRecord;
  sofia?: ReaderOutputRecord;
}

// Displays reading team status on uploaded documents
export default defineComponent({
  name: 'ModalReadersStatus',
  components: {
    Modal
  },
  emits: [
    'close'
  ],
  computed: {
    ...mapGetters({
      project: 'app/project',
      projectMetadata: 'app/projectMetadata'
    })
  },
  data: () => ({
    readersStatus: [] as GroupedRecord[],
    timestamp: 0 // Track the "next" extended_at
  }),
  mounted() {
    const t = this.projectMetadata.extended_at || (new Date()).getTime();
    this.timestamp = (new Date()).getTime();

    getReadersStatus(t).then(data => {
      const grouped = _.groupBy(data, d => d.document_id);
      Object.keys(grouped).forEach(id => {
        const record: GroupedRecord = { document_id: id };
        grouped[id].forEach(reader => {
          switch (reader.identity) {
            case Readers.EIDOS:
              record.eidos = reader;
              break;
            case Readers.HUME:
              record.hume = reader;
              break;
            default:
              record.sofia = reader;
          }
        });
        this.readersStatus.push(record);
      });
    });
  },
  methods: {
    async addToProject() {
      const payload: ReaderOutputRecord[] = [];
      this.readersStatus.forEach(record => {
        if (record.eidos) payload.push(record.eidos);
        if (record.hume) payload.push(record.hume);
        if (record.sofia) payload.push(record.sofia);
      });
      await projectService.createAssemblyRequest(this.project, payload, this.timestamp);

      // Update cached project metadata
      this.projectMetadata.extended_at = this.timestamp;

      this.close();
    },
    close() {
      this.$emit('close');
    }
  }
});
</script>

<style lang="scss" scoped>
::v-deep(.modal-container) {
  .modal-body {
    height: 300px;
    overflow-y: scroll;
  }
}
</style>


