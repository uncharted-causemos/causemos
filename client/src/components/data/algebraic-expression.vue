<template>
  <div
    class="algebraic-expression-container"
    :class="{
      'disabled': disabled,
      'right-padding': canSwap,
      'display-only': isDisplayOnly
    }"
  >
    <div
      v-for="(term, index) in terms"
      :key="term.id">
      <i
        v-if="index !== 0"
        :key="'transform-icon' + index"
        class="fa fa-fw transform-icon"
        :class="`fa-${algebraicTransform.icon}`"
      />
      <algebraic-expression-term
        :key="term.id"
        :model-id="term.modelId"
        :run-id="term.selection.runId"
        :output-variable="term.outputVariable"
        :analysis-item-id="term.id"
        :is-display-only="isDisplayOnly"
      />
    </div>
    <i
      v-if="terms.length > 0 && emptySlotCount > 0"
      class="fa fa-fw transform-icon faded"
      :class="`fa-${algebraicTransform.icon}`"
    />
    <div
      v-for="i in emptySlotCount"
      :key="i"
      class="empty-slot"
      :class="{'top-margin': i > 1}"
    />
    <button
      v-if="canSwap"
      class="btn swap-button"
      @click="swapAlgebraicTransformInputs"
    >
      <i
        class="fa fa-fw fa-arrows-v"
      />
    </button>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import AlgebraicExpressionTerm from '@/components/data/algebraic-expression-term';

export default {
  name: 'AlgebraicExpression',
  components: {
    AlgebraicExpressionTerm
  },
  props: {
    disabled: {
      type: Boolean,
      default: true
    },
    isDisplayOnly: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    analysisItems: []
  }),
  computed: {
    ...mapGetters({
      _analysisItems: 'dataAnalysis/analysisItems',
      algebraicTransform: 'dataAnalysis/algebraicTransform',
      algebraicTransformInputIds: 'dataAnalysis/algebraicTransformInputIds'
    }),
    emptySlotCount() {
      if (this.isDisplayOnly) return 0;
      let count = 2;
      if (this.algebraicTransform !== null) {
        if (this.algebraicTransform.maxInputCount === null) {
          // This transform supports an unbounded number of terms
          count = this.terms.length === 6 ? 0 : 1;
        } else {
          count = this.algebraicTransform.maxInputCount - this.terms.length;
        }
      }
      return count;
    },
    terms() {
      return this.algebraicTransformInputIds.map(inputId => this.analysisItems.find(item => item.id === inputId));
    },
    canSwap() {
      return !this.isDisplayOnly &&
        this.algebraicTransform !== null &&
        this.algebraicTransform.maxInputCount === 2 &&
        this.terms.length === 2;
    }
  },
  watch: {
    // This is a workaround to allow for deep watching of
    //  analysisItems. Specifically, it allows `terms` to
    //  be recomputed when nested data like the selected
    //  run changes.
    _analysisItems: {
      handler() {
        this.analysisItems = this._analysisItems;
      },
      immediate: true,
      deep: true
    }
  },
  methods: {
    ...mapActions({
      swapAlgebraicTransformInputs: 'dataAnalysis/swapAlgebraicTransformInputs'
    })
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.algebraic-expression-container {
  width: calc(100% - 10px);
  padding: 10px;
  border: 1px solid #CACBCC;
  border-radius: 4px;
  position: relative;

  &.disabled {
    opacity: .25;
  }

  &.right-padding {
    padding-right: 20px;
  }

  &.display-only {
    background: $background-light-2;
    border: none;
  }
}

.transform-icon {
  width: 100%;
  text-align: center;
  margin: 5px 0;

  &.faded {
    opacity: .25;
  }
}

.empty-slot {
  width: 100%;
  height: 40px;
  background: $background-light-2;
  border-radius: 3px;

  &.top-margin {
    margin-top: 5px;
  }
}

.swap-button {
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  padding: 2px;
}
</style>
