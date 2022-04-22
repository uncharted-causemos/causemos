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
import { cleanConceptString } from '@/utils/concept-util';
import ModalConfirmation from '@/components/modals/modal-confirmation.vue';

const regex = RegExp('^[A-Za-z0-9/_ ]+$');

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
      required: true
    },
    restrictedNames: {
      type: Array as PropType<string[]>,
      default: []
    },
    restrictAlphanumeric: {
      type: Boolean,
      default: false
    }
  },
  emits: ['confirm', 'cancel', 'reject', 'reject-alphanumeric'],
  setup(props) {
    const newNameInput = ref(props.currentName);

    return {
      newNameInput
    };
  },
  methods: {
    onConfirm() {
      const currName = this.currentName;
      const newName = this.newNameInput;

      // Nothing, same as cancel
      if (newName === currName) {
        this.$emit('cancel');
        return;
      }

      if (newName) {
        if (!_.isEmpty(this.restrictedNames) && this.restrictedNames.includes(newName)) {
          this.$emit('reject', { currentName: currName, newName: newName });
          return;
        }
        if (this.restrictAlphanumeric === true && regex.test(this.newNameInput) === false) {
          this.$emit('reject-alphanumeric', { currentName: currName, newName: newName });
          return;
        }
        this.$emit('confirm', cleanConceptString(this.newNameInput));
      }
    },
    onCancel() {
      this.newNameInput = '';
      this.$emit('cancel');
    }
  }
});
</script>
