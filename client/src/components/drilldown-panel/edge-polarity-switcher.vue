<template>
  <div @click="closeAll()">
    <div
      class="warning-message"
      v-if="typeInconsistency === true && currentView === 'quantitative'">
      <i class="fa fa-fw fa-exclamation-triangle"></i>Inferred relationship type is different than selected type.
    </div>
    <div
      class="warning-message"
      v-if="valueInconsistency=== true && currentView === 'quantitative'">
      <i class="fa fa-fw fa-exclamation-triangle"></i>Inferred relationship strength is different than selected strength.
    </div>
    <div
      class="warning-message"
      v-if="polarityInconsistency=== true && currentView === 'quantitative'">
      <i class="fa fa-fw fa-exclamation-triangle"></i>Inferred polarity conflicts with existing polarity.
    </div>

    <div
      v-if="selectedRelationship.parameter"
      style="display: inline-block">
      <span
        v-if="currentView === 'quantitative' && currentEngine !== 'delphi' && currentEngine !== 'delphi_dev'"
        class="clickable-dropdown"
        :class="{'warning-message': typeInconsistency}"
        @click.stop="openEdgeTypeDropdown()">
        <i v-if="currentEdgeType === 'level'" class="fa fa-fw fa-bolt" />
        {{ weightTypeString(currentEdgeType) }}
        <i class="fa fa-fw fa-caret-down" />
      </span>
      <span
        v-if="currentView === 'qualitative'"
        class="clickable-dropdown">
        <i v-if="currentEdgeType === 'level'" class="fa fa-fw fa-bolt" />
        {{ weightTypeString(currentEdgeType) }} &nbsp;
      </span>
      <dropdown-control
        v-if="isEdgeTypeOpen"
        class="edge-type-dropdown">
        <template #content>
          <edge-weight-dropdown-option
            :value="'level'"
            :selected-value="currentEdgeType"
            :label="weightTypeString('level')"
            :is-inferred="isInferredValue('edgeType', 'level')"
            @click="setType('level')"
          />
          <edge-weight-dropdown-option
            :value="'trend'"
            :selected-value="currentEdgeType"
            :label="weightTypeString('trend')"
            :is-inferred="isInferredValue('edgeType', 'trend')"
            @click="setType('trend')"
          />
        </template>
      </dropdown-control>
    </div>
    <div style="display: inline-block">
      {{ ontologyFormatter(selectedRelationship.source) }}
      leads to&nbsp;
    </div>
    <div
      v-if="selectedRelationship.parameter && selectedRelationship.parameter.weights"
      style="display: inline-block">
      <span
        v-if="currentView === 'quantitative'"
        class="clickable-dropdown"
        :class="{'warning-message': valueInconsistency}"
        @click.stop="openEdgeWeightDropdown()">
        {{ weightValueString(currentEdgeWeight) }}
        <i class="fa fa-fw fa-caret-down" />
      </span>
      <span
        v-if="currentView === 'qualitative'"
        class="clickable-dropdown">
        {{ weightValueString(currentEdgeWeight) }} &nbsp;
      </span>

      <dropdown-control
        v-if="isEdgeWeightOpen"
        class="edge-type-dropdown">
        <template #content>
          <edge-weight-dropdown-option
            :value="0.1"
            :selected-value="currentEdgeWeight"
            :label="weightValueString(0.1)"
            :detailed-value="'0.1'"
            @click="setWeight(0.1)"
          />
          <edge-weight-dropdown-option
            :value="0.5"
            :selected-value="currentEdgeWeight"
            :label="weightValueString(0.5)"
            :detailed-value="'0.5'"
            @click="setWeight(0.5)"
          />
          <edge-weight-dropdown-option
            :value="0.9"
            :selected-value="currentEdgeWeight"
            :label="weightValueString(0.9)"
            :detailed-value="'0.9'"
            @click="setWeight(0.9)"
          />
          <edge-weight-dropdown-option
            :value="inferredWeightValue"
            :selected-value="currentEdgeWeight"
            :label="weightValueString(inferredWeightValue)"
            :detailed-value="inferredWeightValue.toFixed(3)"
            :is-inferred="true"
            @click="setWeight(inferredWeightValue)"
          />
        </template>
      </dropdown-control>
    </div>
    <div style="display: inline-block">
      <span
        class="clickable-dropdown"
        :class="{'warning-message': polarityInconsistency}"
        @click.stop="openEdgePolarityDropdown()">
        {{ polarityLabel }}
        <i class="fa fa-fw fa-caret-down" />
      </span>
      <dropdown-control
        v-if="isEdgePolarityOpen"
        class="edge-type-dropdown">
        <template #content>
          <div class="dropdown-option polarity-same" @click="setPolarity(1)">increase</div>
          <div class="dropdown-option polarity-opposite" @click="setPolarity(-1)">decrease</div>
        </template>
      </dropdown-control>
    </div>
    <div style="display: inline-block">
      in {{ ontologyFormatter(selectedRelationship.target) }}
    </div>
  </div>
  <div
    v-if="currentEdgeType === 'trend'"
    style="color: #888">
    A decrease of&nbsp;
    {{ ontologyFormatter(selectedRelationship.source) }} leads to
    {{ weightValueString(currentEdgeWeight) }}
    {{ inversePolarityLabel }}
    in {{ ontologyFormatter(selectedRelationship.target) }}
  </div>
  <div
    v-if="currentEdgeType === 'level'"
    style="color: #888">
    A low amount of&nbsp;
    {{ ontologyFormatter(selectedRelationship.source) }} leads to
    a smaller
    {{ polarityLabel }}
    in {{ ontologyFormatter(selectedRelationship.target) }}
  </div>

  <img
    v-if="polarity !== 0"
    style="padding-bottom: 15px; height: 85px"
    :src="explainerGlyphFilepath"
  >
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, toRefs, PropType, watchEffect } from 'vue';
import { useStore } from 'vuex';
import DropdownControl from '@/components/dropdown-control.vue';
import { STATEMENT_POLARITY, statementPolarityColor } from '@/utils/polarity-util';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import { decodeWeights } from '@/services/model-service';
import { Engine } from '@/types/Enums';
import { CAGModelSummary, EdgeParameter } from '@/types/CAG';
import EdgeWeightDropdownOption from '@/components/drilldown-panel/edge-weight-dropdown-option.vue';
import { supportsLevelEdges } from '@/utils/engine-util';

const EDGE_TYPE_LEVEL = 'level';
const EDGE_TYPE_TREND = 'trend';

const getEdgeTypeString = (edge: EdgeParameter): string => {
  const param = edge.parameter;
  if (param && param.weights) {
    return param.weights[0] > param.weights[1] ? EDGE_TYPE_LEVEL : EDGE_TYPE_TREND;
  }
  return '';
};


// FIXME: Need better init heuristic because engine numbers are not discrete??
const getEdgeWeight = (edge: EdgeParameter): number => {
  const type = getEdgeTypeString(edge);
  const param = edge.parameter;
  if (param && param.weights) {
    const w = type === EDGE_TYPE_TREND ? param.weights[1] : param.weights[0];
    if (w > 0.7) return 0.9;
    if (w > 0.3) return 0.5;
    return 0.1;
  }
  return 0;
};

enum DROPDOWN {
  EDGE_TYPE = 'edge-type',
  EDGE_WEIGHT = 'edge-weight',
  EDGE_POLARITY = 'edge-polarity',
  NONE = 'none',
}


export default defineComponent({
  name: 'EdgePolaritySwitcher',
  components: {
    DropdownControl,
    EdgeWeightDropdownOption
  },
  emits: ['edge-set-user-polarity', 'edge-set-weights'],
  props: {
    modelSummary: {
      type: Object as PropType<CAGModelSummary>,
      required: true
    },
    selectedRelationship: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const ontologyFormatter = useOntologyFormatter();
    const store = useStore();
    const currentView = computed(() => store.getters['app/currentView']);
    // FIXME: the type of CAGModelParameter.engine should be `Engine` instead of `string`
    const currentEngine = computed(
      () => props.modelSummary.parameter.engine as Engine
    );

    const { selectedRelationship } = toRefs(props);

    const dropDown = ref(DROPDOWN.NONE);
    const isEdgeTypeOpen = computed(() => {
      return dropDown.value === DROPDOWN.EDGE_TYPE;
    });
    const isEdgeWeightOpen = computed(() => {
      return dropDown.value === DROPDOWN.EDGE_WEIGHT;
    });
    const isEdgePolarityOpen = computed(() => {
      return dropDown.value === DROPDOWN.EDGE_POLARITY;
    });

    const currentEdgeType = ref(getEdgeTypeString(props.selectedRelationship as EdgeParameter));
    const currentEdgeWeight = ref(getEdgeWeight(props.selectedRelationship as EdgeParameter));
    const engineWeights = ref((props.selectedRelationship as EdgeParameter).parameter?.engine_weights);

    const inferredWeights = computed(() => {
      return engineWeights.value
        ? engineWeights.value[props.modelSummary.parameter.engine]
        : [0, 0];
    });

    const inferred = ref(decodeWeights(inferredWeights.value));

    const inferredWeightType = computed(() => {
      return inferred.value.weightType === 'level' ? EDGE_TYPE_LEVEL : EDGE_TYPE_TREND;
    });

    const inferredWeightValue = computed(() => {
      return inferred.value.weightValue;
    });

    const typeInconsistency = computed(() => {
      return (
        supportsLevelEdges(currentEngine.value) &&
        inferredWeightType.value !== currentEdgeType.value
      );
    });

    const valueInconsistency = computed(() => {
      return Math.abs(inferredWeightValue.value - currentEdgeWeight.value) > 0.5;
    });

    const polarityInconsistency = computed(() => {
      if (['delphi', 'delphi_dev'].includes(props.modelSummary.parameter.engine) && inferredWeights.value[2]) {
        return inferredWeights.value[2] * props.selectedRelationship.polarity < 0;
      }
      return false;
    });

    watch(
      [selectedRelationship.value],
      () => {
        engineWeights.value = (props.selectedRelationship as EdgeParameter).parameter?.engine_weights;
        currentEdgeWeight.value = getEdgeWeight(props.selectedRelationship as EdgeParameter);
        currentEdgeType.value = getEdgeTypeString(props.selectedRelationship as EdgeParameter);
      },
      { immediate: true }
    );

    return {
      currentView,
      currentEngine,
      ontologyFormatter,

      isEdgeTypeOpen,
      isEdgeWeightOpen,
      isEdgePolarityOpen,
      dropDown,

      currentEdgeType,
      currentEdgeWeight,

      inferred,
      inferredWeightType,
      inferredWeightValue,

      typeInconsistency,
      valueInconsistency,
      polarityInconsistency,

      STATEMENT_POLARITY
    };
  },
  computed: {
    polarity(): number {
      return this.selectedRelationship.polarity;
    },
    polarityColor(): { color: string } {
      return statementPolarityColor(this.polarity);
    },
    polarityLabel(): string {
      if (this.polarity === 1) return 'increase';
      if (this.polarity === -1) return 'decrease';
      return 'unknown';
    },
    inversePolarityLabel(): string {
      if (this.polarity === 1) return 'decrease';
      if (this.polarity === -1) return 'increase';
      return 'unknown';
    },
    explainerGlyphFilepath(): string {
      return this.buildExplainerGlyphFilepath(this.polarity, this.currentEdgeWeight, this.currentEdgeType);
    }
  },
  methods: {
    closeAll() {
      this.dropDown = DROPDOWN.NONE;
    },
    openEdgeTypeDropdown() {
      this.dropDown = DROPDOWN.EDGE_TYPE;
    },
    openEdgeWeightDropdown() {
      this.dropDown = DROPDOWN.EDGE_WEIGHT;
    },
    openEdgePolarityDropdown() {
      this.dropDown = DROPDOWN.EDGE_POLARITY;
    },
    weightValueString(v: number): string {
      const normalizedV = +v.toFixed(3);
      if (normalizedV >= 0.9) return 'a large';
      if (normalizedV >= 0.5) return 'a medium';
      return 'a small';
    },
    weightTypeString(v: string): string {
      if (v === EDGE_TYPE_LEVEL) return 'A high amount of';
      return 'An increase of';
    },
    setPolarity(v: number) {
      this.$emit('edge-set-user-polarity', this.selectedRelationship, v);
    },
    setWeight(v: number) {
      let weights: number[];
      if (this.currentEdgeType === EDGE_TYPE_LEVEL) {
        weights = [v, 0];
      } else {
        weights = [0, v];
      }
      this.currentEdgeWeight = v;
      this.$emit('edge-set-weights', this.selectedRelationship, weights);
    },
    setType(v: string) {
      let weights: number[];
      if (v === EDGE_TYPE_LEVEL) {
        weights = [this.currentEdgeWeight, 0];
      } else {
        weights = [0, this.currentEdgeWeight];
      }
      this.currentEdgeType = v;
      this.$emit('edge-set-weights', this.selectedRelationship, weights);
    },
    buildExplainerGlyphFilepath(polarity: number, edgeWeight: number, edgeType: string) {
      // builds the filepath for the relevant explainer glyph using the following format:
      // explainerGlyph_P_W_T.svg
      // P = (p,n), positive or negative polarity
      // W = (s,m,l), small medium or large weight
      // T = (l,t), level or trend type

      let polarityStr = 'n';
      let typeStr = 't';
      let weightStr = 's';

      if (edgeType === EDGE_TYPE_LEVEL) typeStr = 'l';
      if (polarity === 1) polarityStr = 'p';

      if (edgeWeight === 0.9) weightStr = 'l';
      else if (edgeWeight === 0.5) weightStr = 'm';

      const fileName = 'explainerGlyphs/explainerGlyph_' + polarityStr + '_' + weightStr + '_' + typeStr + '.svg';

      const assetFolder = require.context('@/assets/');
      return assetFolder('./' + fileName);
    },
    isInferredValue(dropdownVariable: string, value: string | number) {
      switch (dropdownVariable) {
        case 'edgeType': return value === this.inferredWeightType;
        case 'edgeWeight': return value === this.inferredWeightValue;
        default: return false;
      }
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.clickable-dropdown {
  font-weight: 600;
  cursor: pointer;

  i {
    margin-left: -5px;
  }
}

.clickable-dropdown:hover {
  background: #eee;
}

.edge-type-dropdown {
  font-size: $font-size-medium;
  font-weight: normal;
  cursor: default;
  position: absolute;
  margin: -5px 0 0 4px;
}

.polarity-same {
  color: $positive;
}
.polarity-opposite {
  color: $negative;
}

.warning-message {
  color: #f80;
}
</style>
