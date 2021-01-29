<template>
  <div class="config-bar-container">
    <p>
      <!-- FIXME: range will need to be configurable -->
      <i class="fa fa-fw fa-calendar label-icon" />
      <strong>Historical Data:</strong>
      <a
        @click.stop="editParameters"
      >{{ historicalRange.start | date-formatter('MMM YYYY') }} -
        {{ historicalRange.end | date-formatter('MMM YYYY') }}
      </a>
    </p>
    <p>
      <!-- FIXME: engine and lengths will need to be configurable -->
      <strong>Projection:</strong>
      <a
        @click.stop="editParameters"
      >{{ projectionSteps }} Months ({{ currentEngine }})
      </a>
    </p>
  </div>
</template>

<script>
export default {
  name: 'QuantitativeConfigBar',
  props: {
    modelSummary: {
      type: Object,
      required: true
    }
  },
  computed: {
    historicalRange() {
      return this.modelSummary.parameter.indicator_time_series_range;
    },
    projectionSteps() {
      return this.modelSummary.parameter.num_steps;
    },
    currentEngine() {
      return this.modelSummary.parameter.engine;
    }
  },
  methods: {
    async editParameters() {
      this.$emit('edit-parameters');
    }
  }
};
</script>

<style lang="scss" scoped>

@import "~styles/wm-theme/wm-theme";
@import "~styles/variables";

.config-bar-container {
  background: $background-light-1;
  box-shadow: $shadow-level-1;
  height: $navbar-outer-width;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 1;

  p {
    margin: 0;
  }

  .label-icon {
    margin-right: 5px;
  }

  a {
    padding-left: 5px;
    cursor: pointer;
  }
}
</style>
