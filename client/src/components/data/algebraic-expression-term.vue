<template>
  <div
    class="term-container"
    :class="{ 'display-only': isDisplayOnly }"
  >
    <p><strong>{{ outputVariable }}</strong></p>
    <p class="scenario">{{ scenarioDescription }}</p>
    <close-button
      v-if="!isDisplayOnly"
      class="remove-term-button"
      @click="removeAlgebraicTransformInput(analysisItemId)"
    />
  </div>
</template>

<script>
import { getModelRuns } from '@/services/datacube-service';
import { mapActions } from 'vuex';
import CloseButton from '@/components/widgets/close-button';

export default {
  name: 'AlgebraicExpressionTerm',
  components: {
    CloseButton
  },
  props: {
    modelId: {
      type: String,
      required: true
    },
    runId: {
      type: String,
      required: true
    },
    outputVariable: {
      type: String,
      required: true
    },
    analysisItemId: {
      type: String,
      required: true
    },
    isDisplayOnly: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    runs: []
  }),
  computed: {
    scenarioDescription() {
      if (this.runs.length === 0) return 'Loading...';
      const selectedRun = this.runs.find(run => run.id === this.runId);
      if (!selectedRun || selectedRun.parameters.length === 0) {
        return 'No scenarios available';
      }
      return selectedRun.parameters.reduce((acc, parameter, index) => {
        const { name, value } = parameter;
        if (index !== 0) {
          acc += ', ';
        }
        acc += `${name}: ${value}`;
        return acc;
      }, '');
    }
  },
  watch: {
    modelId: {
      immediate: true,
      async handler() {
        this.runs = await getModelRuns(this.modelId);
      }
    }
  },
  methods: {
    ...mapActions({
      removeAlgebraicTransformInput: 'dataAnalysis/removeAlgebraicTransformInput'
    })
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.term-container {
  background: #EBF1FC;
  border: 1px solid #A4C2FC;
  border-radius: 3px;
  padding: 5px;
  overflow-wrap: break-word;
  position: relative;

  &.display-only {
    background: $background-light-2;
    border-color: #CACBCC;
  }

  p {
    margin: 0;
    margin-right: 20px;

    &.scenario {
      margin-top: 5px;
      color: #9C9D9E;
    }
  }

  &.display-only p {
    margin-right: 0;
  }

  .remove-term-button {
    top: 50%;
    right: 0;
    transform: translateY(-50%);
  }
}

</style>
