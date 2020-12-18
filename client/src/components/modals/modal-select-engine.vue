<template>
  <modal @close="close()">
    <div slot="header">
      <h4>Engine Configuration</h4>
    </div>
    <div
      v-if="selected"
      slot="body"
      class="engine-content-container">
      <div class="engine-options">
        <div
          v-for="option in engineOptions"
          :key="option.key"
          class="option"
          :class="{active: selected === option.key}"
          @click="selectEngine(option.key)">
          {{ option.value }}
        </div>
      </div>
      <div class="engine-description">
        <div class="engine-steps">
          <b>Months to project:&nbsp;</b>
          <input
            v-model.number="projectionSteps"
            type="number"
            min="1"
            step="1"
            max="99"
            @input="checkMaxProjectionSteps()">
        </div>
        <div v-if="selected === 'dyse'">
          <div>Framework for assembling causal networks and dynamically executing models.</div>
          <div><p /></div>
          <div><b> When to use: </b></div>
          <div>- Integration of concepts from reading and abstractions of domain models.</div>
          <div>- Simulations of abstract causal models and interventions (30-150 nodes).</div>
          <div>- Rapidly provides detailed timing information and dynamics of complex feedback relationships.</div>
        </div>
        <div v-if="selected === 'delphi'">
          <div>Modeling engine for assembling causal dynamic bayes networks from reading evidence.</div>
          <div><p /></div>
          <div><b> When to use: </b></div>
          <div>- Causal models up to ~20 nodes. </div>
          <div>- Need of quantification of uncertainty in interpretation of natural language descriptions of model dynamics using gradable adjectives.</div>
        </div>
      </div>
    </div>
    <div slot="footer">
      <button
        class="btn btn-light"
        @click.stop="close()">
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        @click="selectProjectionEngine()">
        Save
      </button>
    </div>
  </modal>
</template>

<script>
import _ from 'lodash';
import Modal from '@/components/modals/modal';
import { ENGINE_OPTIONS } from '@/utils/projection-util';

/**
 * This is the confirmation dialog for removing knowledge bases, projects and models.
 * It just handles the confirmation, it is up to the parent component to handle the actual
 * deletion process.
 */
export default {
  name: 'ModalSelectEngine',
  components: {
    Modal
  },
  props: {
    engine: {
      type: String,
      required: true
    },
    engineProjectionSteps: {
      type: Number,
      required: true
    }
  },
  data: () => ({
    selected: 'dyse',
    projectionSteps: 0,
    engineOptions: ENGINE_OPTIONS
  }),
  computed: {
    maxProjectionSteps() {
      return this.engineOptions.find(d => d.key === this.selected).maxSteps;
    }
  },
  mounted() {
    this.selected = this.engine;
    this.projectionSteps = this.engineProjectionSteps;
  },
  methods: {
    selectEngine(option) {
      this.selected = option;
    },
    selectProjectionEngine() {
      if (_.isEmpty(this.selected)) return;
      this.$emit('selectProjectionEngine', {
        engine: this.selected,
        engineProjectionSteps: this.projectionSteps
      });
      this.$emit('close', null);
    },
    checkMaxProjectionSteps() {
      if (+this.projectionSteps > this.maxProjectionSteps) {
        this.projectionSteps = this.maxProjectionSteps;
      }
    },
    close() {
      this.$emit('close', null);
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/wm-theme/wm-theme";
@import '~styles/variables';

/deep/ .modal-container {
  width: 700px;
}
.engine-content-container {
  display: flex;
  .engine-steps {
    margin-bottom: 15px;
  }
  .engine-options {
    display: flex;
    flex-direction: column;
    min-width: 140px;
    .option {
      padding: 15px;
    }
    .option:hover {
      background-color: $color-btn-default-hover;
      border-color: $color-btn-default-hover;
      cursor: pointer;
    }
    .active {
      background: $selected;
    }
  }
  .engine-description {
    flex-grow: 8;
    padding: 0px 10px;
  }
  input {
    width: 60px;
  }
}
</style>
