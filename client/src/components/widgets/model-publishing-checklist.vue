<template>
    <div class="model-publishing-checklist-container">
      <div
        v-if="metadata && metadata.status !== DatacubeStatus.Deprecated"
        class="checklist-items-container"
      >
        <div
          v-for="step in publishingSteps"
          :key="step.id"
          class="checklist-item"
          @click="navToPublishingStep(step)">
            <i
              class="step-icon-common fa fa-lg fa-border"
              :class="{
                'fa-check-circle step-complete': step.completed,
                'fa-circle step-not-complete': !step.completed,
              }"
            />
            <span
              class="checklist-item-text"
              :class="{'step-selected': step.id === currentPublishStep}"
            >{{ step.text }}</span>
        </div>
      </div>
      <div style="display: flex; align-items: center">
        <span v-if="metadata && metadata.status === DatacubeStatus.Deprecated" style="margin: 2px; padding: 2px 5px; font-size: large; font-weight: bolder" :style="{ backgroundColor: statusColor }">{{ statusLabel }}</span>
        <button
          v-if="metadata && metadata.status !== DatacubeStatus.Deprecated"
          class="btn btn-primary btn-call-for-action"
          :class="{ 'disabled': allStepsCompleted === false}"
          style="padding: 6px 10px; border-radius: 4px;"
          @click="publishModel()">
            Publish model
        </button>
      </div>
    </div>
</template>

<script lang="ts">
import { DatacubeStatus, ModelPublishingStepID } from '@/types/Enums';
import { Model, ModelPublishingStep } from '@/types/Datacube';
import { defineComponent, PropType, toRefs } from 'vue';
import useDatacubeVersioning from '@/services/composables/useDatacubeVersioning';

export default defineComponent({
  name: 'ModelPublishingChecklist',
  props: {
    publishingSteps: {
      type: Array as PropType<ModelPublishingStep[]>,
      default: []
    },
    currentPublishStep: {
      default: ModelPublishingStepID.Enrich_Description
    },
    metadata: {
      type: Object as PropType<Model | null>,
      default: null
    }
  },
  emits: [
    'publish-model', 'navigate-to-publishing-step'
  ],
  setup(props) {
    const { metadata } = toRefs(props);

    const { statusColor, statusLabel } = useDatacubeVersioning(metadata);

    return {
      DatacubeStatus,
      statusColor,
      statusLabel
    };
  },
  computed: {
    allStepsCompleted(): boolean {
      return this.publishingSteps.every(s => s.completed);
    }
  },
  methods: {
    navToPublishingStep(step: ModelPublishingStep) {
      this.$emit('navigate-to-publishing-step', { publishStep: step });
    },
    publishModel() {
      (this as any).toaster('Publishing model ...');
      this.$emit('publish-model');
    }
  }
});
</script>

<style lang="scss" scoped>
  @import "~styles/variables";

  .step-selected {
    border-bottom: 2px solid gray;
  }

  .model-publishing-checklist-container {
    display: flex;
    flex-direction: row;
    padding: 4px;
    justify-content: space-evenly;

    .checklist-items-container {
      display: flex;
      flex-direction: row;
      align-items: center;

      .checklist-item {
        flex-direction: row;
        cursor: pointer;
        font-size: $font-size-medium;
        padding-right: 24px;

        .checklist-item-text {
          margin-left: 5px;
          display: inline-block;
        }
      }
    }

    .step-icon-common {
      border-width: 1px;
      border-style: solid;
      border-radius: 100% 100% 100% 100%;
      padding: 0;
    }

    .step-complete {
      color: green;
      border-color: green;
    }

    .step-not-complete {
      border-color: red;
      color: transparent;
    }
  }
</style>
