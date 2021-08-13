<template>
  <modal>
    <template #header>
      <h4 class="title"><i class="fa fa-fw fa-book" /> Rename Parameter(s) Choices</h4>
    </template>
    <template #body>
      <label v-if="updatedParameter">
        <b>Parameter:</b>
        {{updatedParameter.display_name !== '' ? updatedParameter.display_name : updatedParameter.name}}
      </label>
      <div v-if="updatedParameter" class="param-choices-container">
        <div class="row">
          <label class="col-md-3">Value(s)</label>
          <label>Label(s)</label>
        </div>
        <div
          v-for="(choice, indx) in updatedParameter.choices"
          :key="choice"
          class="row" style="padding-bottom: 1rem;">
          <label class="col-md-3">{{choice}}</label>
          <input
              v-model="updatedParameter.choices_labels[indx]"
              type="text"
          >
        </div>
      </div>
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
          @click.stop="saveUpdatedParamChoices()">
            Update
        </button>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import Modal from '@/components/modals/modal.vue';
import { ModelParameter } from '@/types/Datacube';
import _ from 'lodash';

export default defineComponent({
  name: 'ModalEditParamChoices',
  components: {
    Modal
  },
  emits: [
    'close'
  ],
  props: {
    selectedParameter: {
      type: Object as PropType<ModelParameter>,
      required: true
    }
  },
  computed: {
  },
  data: () => ({
    updatedParameter: undefined as ModelParameter | undefined
  }),
  mounted() {
    this.updatedParameter = _.cloneDeep(this.selectedParameter);
  },
  methods: {
    async saveUpdatedParamChoices() {
      // optimization: do not save if nothing has changed
      //  compare 'updatedParameter' against 'selectedParameter'
      if (_.isEqual(this.updatedParameter?.choices_labels, this.selectedParameter?.choices_labels)) {
        this.close();
      }

      // save updated parameter choices (i.e., save metadata)
      this.$emit('close', { cancel: false, updatedParameter: this.updatedParameter });
    },
    close(cancel = true) {
      this.$emit('close', { cancel });
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

::v-deep(.modal-container) {
  width: max-content;
  max-width: 80vw;
  .modal-body {
    height: 300px;
    overflow-y: scroll;
  }
}

.title {
  text-transform: initial !important;
  margin-top: 2rem;
  padding-left: 2rem;
  font-weight: bold;
  font-size: x-large !important;
}

.param-choices-container {
  padding: 1rem;
}

</style>
