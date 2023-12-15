<template>
  <div class="model-publishing-checklist-container">
    <div
      v-for="step in publishingSteps"
      :key="step.id"
      class="checklist-item"
      @click="navToPublishingStep(step)"
    >
      <span>{{ step.text }}</span>
      <i
        class="step-icon-common fa fa-lg fa-check-circle"
        :class="{ 'step-complete': step.completed }"
      />
    </div>
    <button
      class="btn btn-default btn-call-to-action"
      :class="{ disabled: allStepsCompleted === false }"
      @click="publishModel()"
    >
      Publish model
    </button>
  </div>
</template>

<script setup lang="ts">
import { ModelPublishingStep } from '@/types/Datacube';
import { computed, toRefs } from 'vue';
import useToaster from '@/composables/useToaster';
import { TYPE } from 'vue-toastification';
import { ModelPublishingStepID } from '@/types/Enums';

const props = defineProps<{
  publishingSteps: ModelPublishingStep[];
}>();
const { publishingSteps } = toRefs(props);

const emit = defineEmits<{
  (e: 'publish-model'): void;
  (e: 'navigate-to-publishing-step', step: ModelPublishingStepID): void;
}>();

const allStepsCompleted = computed(() => publishingSteps.value.every((s) => s.completed));

const navToPublishingStep = (step: ModelPublishingStep) =>
  emit('navigate-to-publishing-step', step.id);

const toaster = useToaster();
const publishModel = () => {
  toaster('Publishing model ...', TYPE.INFO, false);
  emit('publish-model');
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/common';

.model-publishing-checklist-container {
  display: flex;
  flex-direction: row;
  gap: 20px;
  align-items: center;

  .checklist-item {
    display: flex;
    gap: 5px;
    cursor: pointer;
    align-items: center;
  }

  .step-icon-common {
    border-radius: 100%;
    padding: 0;
    width: 16px;
    height: 16px;
    color: $un-color-black-20;
  }

  .step-complete {
    color: $vetted-state-dark;
  }
}
</style>
