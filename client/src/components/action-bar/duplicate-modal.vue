<template>
  <modal-confirmation
    :autofocus-confirm="false"
    @confirm="onConfirm"
    @close="onCancel"
  >
    <template #title>{{ modalTitle }}</template>
    <template #message>
      <input
        v-focus
        type="text"
        class="form-control"
        :value="currentName"
        @focus="$event.target.select()"
        @input="newNameInput = $event.target.value"
        @keyup.enter="onConfirm"
      >
    </template>
  </modal-confirmation>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ModalConfirmation from '@/components/modals/modal-confirmation.vue';
import modelService from '@/services/model-service';
import { CAG } from '@/utils/messages-util';
import useToaster from '@/services/composables/useToaster';

export default defineComponent({
  name: 'DuplicateModel',
  components: {
    ModalConfirmation
  },
  props: {
    modalTitle: {
      type: String,
      default: 'Name Duplicate Model'
    },
    currentName: {
      type: String,
      default: ''
    },
    idToDuplicate: {
      type: String,
      default: ''
    }
  },
  emits: ['success', 'fail', 'cancel'],
  data: () => ({
    newNameInput: ''
  }),
  setup() {
    return {
      toaster: useToaster()
    };
  },
  methods: {
    onConfirm() {
      modelService.duplicateModel(this.idToDuplicate, this.newNameInput || this.currentName).then((result) => {
        this.toaster(CAG.SUCCESSFUL_DUPLICATE, 'success', false);
        this.$emit('success', this.newNameInput || this.currentName, result.id);
      }).catch(() => {
        this.toaster(CAG.ERRONEOUS_DUPLICATE, 'error', false);
        this.$emit('fail', this.newNameInput || this.currentName);
      });
    },
    onCancel() {
      this.newNameInput = '';
      this.$emit('cancel');
    }
  }
});
</script>
