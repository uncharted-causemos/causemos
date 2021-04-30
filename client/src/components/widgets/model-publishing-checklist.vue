<template>

    <div class="model-publishing-checklist-container">
      <span class="title">Model Publishing</span>
      <div class="checklist-items-container">
        <span class="checklist-header">This is your checklist</span>
        <div
          v-for="(step, indx) in publishingSteps"
          :key="step.id"
          class="checklist-item"
          :class="{'step-selected': indx === currentPublishingStep}"
          @click="navToPublishingStep(step, indx)">
            <i
              class="step-icon-common fa fa-lg fa-border"
              :class="{
                'fa-check-circle step-complete': step.completed,
                'fa-circle step-not-complete': !step.completed,
              }"
            />
            <span class="checklist-item-text">{{ step.text }}</span>
            <i class="fa fa-chevron-right"
            />
        </div>
      </div>
      <div class="footer">
        Repeat the last two steps to capture additional use cases.
      </div>
      <button
        class="search-button btn btn-primary btn-call-for-action"
        :class="{ 'disabled': allStepsCompleted === false}"
        @click="publishModel()">
          Publish model
      </button>
    </div>
</template>

<script lang="ts">
import { ModelPublishingStep } from '@/types/UseCase';
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  name: 'ModelPublishingChecklist',
  props: {
    publishingSteps: {
      type: Array as PropType<ModelPublishingStep[]>,
      default: []
    },
    currentPublishingStep: {
      default: 0
    }
  },
  emits: [
    'publish-model', 'navigate-to-publishing-step'
  ],
  computed: {
    allStepsCompleted(): boolean {
      return this.publishingSteps.every(s => s.completed);
    }
  },
  watch: {
  },
  mounted(): void {
  },
  methods: {
    navToPublishingStep(step: ModelPublishingStep, indx: number) {
      this.$emit('navigate-to-publishing-step', { publishStepIndex: indx });
    },
    publishModel() {
      (this as any).toaster('Publishing model ...');
      // TODO: redirect to another view where the published model can be seen
    }
  }
});
</script>

<style lang="scss" scoped>
  @import "~styles/variables";

  .step-selected {
    background-color: rgb(163, 221, 255);
  }

  .model-publishing-checklist-container {
    display: block;
    background-color: rgb(236, 236, 236);
    position: absolute;
    margin: auto;
    display: flex;
    flex-direction: column;
    padding: 15px;
    box-shadow: 0px 5px 4px 2px rgba(0, 0, 0, 0.05),
                0px 3px 2px 1px rgba(0, 0, 0, 0.05);
    z-index: 1;

    .checklist-items-container {
      background-color: white;
      border-top: 1px solid black;
      padding-bottom: 15px;
      padding: 5px;
      display: flex;
      flex-direction: column;

      .checklist-item {
        padding-top: 5px;
        padding-left: 5px;
        padding-right: 5px;
        flex-direction: row;
        cursor: pointer;
        font-size: 16px;

        .checklist-item-text {
          padding: 0 10px;
          width: 180px;
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

    .title {
      text-transform: uppercase;
      font-weight: bold;
      font-size: 18px;
      color: black;
    }

    .footer {
      width: 200px;
      padding: 10px;
    }

    .checklist-header {
      font-style: italic;
      color: rgb(87, 87, 87);
    }
  }
</style>
