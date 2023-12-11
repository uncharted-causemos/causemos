<template>
  <modal @close="close">
    <template #header>
      <h4 class="title">How are projections calculated?</h4>
    </template>
    <template #body>
      <section>
        <h5>
          For each <strong>concept with a dataset</strong>, Causemos tries to continue the trends
          observed in the historical data.
        </h5>
        <section>
          <p>
            If the historical data has a strong seasonal pattern, Causemos uses
            <a href="https://otexts.com/fpp2/holt-winters.html" rel="noreferrer" target="_blank">
              Holt-Winters' projection algorithm</a
            >.
          </p>
          <p>
            If not, Causemos uses
            <a href="https://otexts.com/fpp2/holt.html" rel="noreferrer" target="_blank"
              >Holt's linear trend projection algorithm</a
            >.
          </p>
        </section>
        <p>Note:</p>
        <ul>
          <li>Projections don't account for concept-specific dynamics.</li>
          <ul>
            <li>For example, they don't know that rainfall can't go below 0.</li>
          </ul>
          <li>
            Projections typically fall within a range of 0-1, which represent the lowest and highest
            values in the historical data. However, projected values may sometimes exceed these
            values.
          </li>
          <li>
            Causemos linearly interpolates between historical data points. Projections are only
            shown before and after the time period covered by the dataset.
          </li>
          <li>A constraint overrides any overlapping projected or historical value.</li>
        </ul>
      </section>

      <section>
        <h5>
          For each <strong>concept without a dataset</strong>, Causemos calculates a weighted sum of
          its inputs.
        </h5>
        <ul>
          <li>
            For each month, Causemos combines the weight-adjusted values of every input concept.
          </li>
          <li>
            If all the supporting datasets have historical data in a given month, that point is
            marked with a circle in the time series to indicate it contains no interpolated or
            projected data.
          </li>
        </ul>
      </section>

      <p>
        For more information, take a look at our
        <a :href="projectionHelpDocsUrl" rel="noreferrer" target="_blank">help docs</a>.
      </p>
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button type="button" class="btn btn-default btn-call-to-action" @click.stop="close">
          Done
        </button>
      </ul>
    </template>
  </modal>
</template>

<script setup lang="ts">
import useApplicationConfiguration from '@/composables/useApplicationConfiguration';
import Modal from './modal.vue';
import { computed } from 'vue';

const emit = defineEmits<{
  (e: 'close'): void;
}>();
const close = () => emit('close');

const { applicationConfiguration } = useApplicationConfiguration();
const projectionHelpDocsUrl = computed(
  () => `${applicationConfiguration.value.CLIENT__USER_DOCS_URL}/projections/`
);
</script>

<style lang="scss" scoped>
@import '@/styles/common';
@import '@/styles/uncharted-design-tokens';

:deep(.modal-container) {
  width: fit-content;
}

section {
  max-width: 100ch;
  margin-bottom: 20px;

  h5 {
    margin-bottom: 20px;
  }
}
</style>
