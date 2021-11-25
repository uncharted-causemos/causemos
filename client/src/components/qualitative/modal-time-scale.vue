<template>
  <modal @close="save">
    <template #header>
      <h2 class="header-question">Which time scale are you interested in?</h2>
    </template>
    <template #body>
      <div
        v-for="timeScaleOption in TIME_SCALE_OPTIONS"
        :key="timeScaleOption.id"
        class="time-scale-option"
      >
        <input
          type="radio"
          :id="timeScaleOption.id"
          :value="timeScaleOption.id"
          v-model="selectedTimeScaleOption"
        />
        <label class="label-column" :for="timeScaleOption.id">
          <h3>{{ timeScaleOption.label }}</h3>
          <h4>Run projections for</h4>
          <p>
            {{
              timeScaleOption.timeSlices.map(slice => slice.label).join(', ')
            }}
          </p>
          <div class="label-row">
            <h4>Example</h4>
            <p>{{ timeScaleOption.example }}</p>
          </div>
        </label>
      </div>
    </template>
    <template #footer>
      <button
        type="button"
        class="btn btn-primary btn-call-for-action"
        @click.stop="save"
      >
        Save
      </button>
    </template>
  </modal>
</template>

<script lang="ts">
import { TimeScale } from '@/types/Enums';
import { TIME_SCALE_OPTIONS } from '@/utils/time-scale-util';
import { defineComponent, PropType, ref, toRefs } from 'vue';
import modal from '../modals/modal.vue';

export default defineComponent({
  components: { modal },
  name: 'ModalTimeScale',
  emits: ['save-time-scale'],
  props: {
    initiallySelectedTimeScale: {
      type: String as PropType<string | null>,
      default: null
    }
  },
  setup(props) {
    const { initiallySelectedTimeScale } = toRefs(props);
    return {
      TIME_SCALE_OPTIONS,
      selectedTimeScaleOption: ref(
        initiallySelectedTimeScale.value ?? TimeScale.Months
      )
    };
  },
  methods: {
    save() {
      this.$emit('save-time-scale', this.selectedTimeScaleOption);
    }
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.header-question {
  font-size: $font-size-extra-large;
  font-weight: normal;
  line-height: $font-size-extra-large;
}

input[type='radio'] {
  appearance: radio;
  cursor: pointer;
  position: relative;
  bottom: -2px;
}

.time-scale-option {
  display: flex;

  &:not(:first-child) {
    margin-top: 10px;
  }
}

.label-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  margin-left: 5px;
  cursor: pointer;

  h3,
  h4,
  p {
    margin: 0;
  }

  h3 {
    font-size: $font-size-large;
    font-weight: normal;
    margin-bottom: 5px;
  }

  h4 {
    @include header-secondary;
  }
}

.label-row {
  display: flex;
  margin-top: 5px;

  & > *:not(:first-child) {
    margin-left: 5px;
  }
}
</style>
