<template>
  <modal>
    <template #header>
      <h4 class="title"><i class="fa fa-fw fa-question" /> New Analytical Question</h4>
    </template>
    <template #body>
      <textarea
        v-model="questionText"
        type="text"
        placeholder="Enter a new analytical question"
        rows="3"
        class="question-text"
      />
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button
          type="button"
          class="btn first-button"
          @click.stop="close()">
            Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary btn-call-for-action"
          :disabled="questionText.length == 0"
          @click.stop="add()">
            Add
        </button>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Modal from '@/components/modals/modal.vue';

export default defineComponent({
  name: 'ModalNewAnalyticalQuestion',
  components: {
    Modal
  },
  emits: [
    'close'
  ],
  data: () => ({
    questionText: ''
  }),
  methods: {
    add() {
      this.close(false);
    },
    close(cancel = true) {
      this.$emit('close', { cancel, text: this.questionText });
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

::v-deep(.modal-container) {
  .modal-body {
    overflow-y: auto;
  }
}

.title {
  text-transform: initial !important;
  margin-top: 2rem;
  padding-left: 2rem;
  font-weight: bold;
  font-size: x-large !important;
}

.question-text {
  padding: 8px;
  width: 100%;
  margin-right: 10px;
  background-color: white;
  border-color: gray;
  border-width: thin;
  height: 100%;
}

</style>
