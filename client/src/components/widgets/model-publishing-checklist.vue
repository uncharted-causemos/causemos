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
        @click="navToPublishingStep(step)"
      >
        <i
          class="step-icon-common fa fa-lg fa-border"
          :class="{
            'fa-check-circle step-complete': step.completed,
            'fa-circle step-not-complete': !step.completed,
          }"
        />
        <span
          class="checklist-item-text"
          :class="{ 'step-selected': step.id === currentPublishStep }"
          >{{ step.text }}</span
        >
      </div>
    </div>
    <div style="display: flex; align-items: center">
      <span
        v-if="metadata && metadata.status === DatacubeStatus.Deprecated"
        style="margin: 2px; padding: 2px 5px; font-size: large; font-weight: bolder"
        :style="{ backgroundColor: statusColor }"
        >{{ statusLabel }}</span
      >
      <button
        v-if="metadata && metadata.status !== DatacubeStatus.Deprecated"
        class="btn btn-call-to-action"
        :class="{ disabled: allStepsCompleted === false }"
        @click="publishModel()"
      >
        Publish model
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DatacubeStatus, ModelPublishingStepID } from '@/types/Enums';
import { Model, ModelPublishingStep } from '@/types/Datacube';
import { computed, toRefs } from 'vue';
import useDatacubeVersioning from '@/composables/useDatacubeVersioning';
import useToaster from '@/composables/useToaster';
import { TYPE } from 'vue-toastification';

const props = defineProps<{
  publishingSteps: ModelPublishingStep[];
  currentPublishStep: ModelPublishingStepID;
  metadata: Model | null;
}>();
const { publishingSteps, metadata } = toRefs(props);

const emit = defineEmits<{
  (e: 'publish-model'): void;
  (e: 'navigate-to-publishing-step', { publishStep }: { publishStep: ModelPublishingStep }): void;
}>();

const { statusColor, statusLabel } = useDatacubeVersioning(metadata);

const allStepsCompleted = computed(() => publishingSteps.value.every((s) => s.completed));

const navToPublishingStep = (step: ModelPublishingStep) =>
  emit('navigate-to-publishing-step', { publishStep: step });

const toaster = useToaster();
const publishModel = () => {
  toaster('Publishing model ...', TYPE.INFO, false);
  emit('publish-model');
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.step-selected {
  border-bottom: 2px solid gray;
}

.model-publishing-checklist-container {
  display: flex;
  flex-direction: row;
  padding: 5px 20px;

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
