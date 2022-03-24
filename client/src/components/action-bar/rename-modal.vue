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
import _ from 'lodash';
import { defineComponent, ref, PropType } from 'vue';
import useToaster from '@/services/composables/useToaster';
import ModalConfirmation from '@/components/modals/modal-confirmation.vue';

export default defineComponent({
  name: 'RenameModal',
  components: {
    ModalConfirmation
  },
  props: {
    modalTitle: {
      type: String,
      default: 'Rename Model'
    },
    currentName: {
      type: String,
      default: ''
    },
    restrictedNames: {
      type: Array as PropType<string[]>,
      default: []
    }
  },
  emits: ['confirm', 'cancel'],
  setup() {
    const toaster = useToaster();
    const newNameInput = ref('');

    return {
      newNameInput,
      toaster
    };
  },
  methods: {
    onConfirm() {
      const currName = this.currentName;
      const newName = this.newNameInput;
      if (newName && newName !== currName) {
        if (!_.isEmpty(this.restrictedNames) && this.restrictedNames.includes(newName)) {
          this.toaster(
            `Cannot rename "${currName}" to "${newName}". "${newName}" is restricted or creates a conflict!`,
            'error',
            true
          );
          return;
        }
        this.$emit('confirm', this.newNameInput.trim());
      }
    },
    onCancel() {
      this.newNameInput = '';
      this.$emit('cancel');
    }
  }
});
</script>
