<template>
  <div @click="closeAll()">
    <div class="warning-message" v-if="typeInconsistency === true && isEdgeWeightEditable">
      <i class="fa fa-fw fa-exclamation-triangle"></i>Inferred relationship type is different than
      selected type.
    </div>
    <div class="warning-message" v-if="valueInconsistency === true && isEdgeWeightEditable">
      <i class="fa fa-fw fa-exclamation-triangle"></i>Inferred relationship strength is different
      than selected strength.
    </div>

    <message-display
      v-if="isEdgeWeightStale"
      :message="'Rerun to edit relationship type and strength.'"
      :message-type="'alert-info'"
    />

    <!-- TODO: can we remove the second clause? I think parameter will always
      be defined if we're in the quantitative space -->
    <div
      v-if="isEdgeWeightEditable && selectedRelationship.parameter"
      style="display: inline-block"
    >
      <span
        v-if="supportsLevelEdges(currentEngine)"
        class="clickable-dropdown"
        :class="{ 'warning-message': typeInconsistency }"
        @click.stop="openEdgeTypeDropdown()"
      >
        <i v-if="currentEdgeType === 'level'" class="fa fa-fw fa-bolt" />
        {{ weightTypeString(currentEdgeType) }}
        <i class="fa fa-fw fa-caret-down" />
      </span>
      <dropdown-control v-if="isEdgeTypeOpen" class="edge-type-dropdown">
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

    <!-- TODO: can we replace this whole thing with isEdgeWeightEditable?
      I think parameter and parameter.weights will always be defined if we're
      in the quantitative space -->
    <div
      v-if="
        selectedRelationship.parameter &&
        selectedRelationship.parameter.weights &&
        !isEdgeWeightStale
      "
      style="display: inline-block"
    >
      <span
        v-if="isEdgeWeightEditable"
        class="clickable-dropdown"
        :class="{ 'warning-message': valueInconsistency }"
        @click.stop="openEdgeWeightDropdown()"
      >
        {{ currentWeightValueString(currentEdgeWeight, inferredWeightValue) }}
        <i class="fa fa-fw fa-caret-down" />
      </span>
      <span v-else class="clickable-dropdown">
        {{ currentWeightValueString(currentEdgeWeight, inferredWeightValue) }} &nbsp;
      </span>

      <dropdown-control v-if="isEdgeWeightOpen" class="edge-type-dropdown">
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
        :class="{
          'warning-message': isEdgeWeightEditable,
        }"
        @click.stop="openEdgePolarityDropdown()"
      >
        {{ polarityLabel }}
        <i class="fa fa-fw fa-caret-down" />
      </span>
      <dropdown-control v-if="isEdgePolarityOpen" class="edge-type-dropdown">
        <template #content>
          <div class="dropdown-option polarity-same" @click="setPolarity(1)">increase</div>
          <div class="dropdown-option polarity-opposite" @click="setPolarity(-1)">decrease</div>
        </template>
      </dropdown-control>
    </div>
    <div style="display: inline-block">in {{ ontologyFormatter(selectedRelationship.target) }}</div>
  </div>
  <div v-if="currentEdgeType === 'trend'" style="color: #888">
    A decrease of&nbsp;
    {{ ontologyFormatter(selectedRelationship.source) }} leads to
    {{ currentWeightValueString(currentEdgeWeight, inferredWeightValue) }}
    {{ inversePolarityLabel }}
    in {{ ontologyFormatter(selectedRelationship.target) }}
  </div>
  <div v-if="currentEdgeType === 'level'" style="color: #888">
    A low amount of&nbsp;
    {{ ontologyFormatter(selectedRelationship.source) }} leads to a smaller
    {{ polarityLabel }}
    in {{ ontologyFormatter(selectedRelationship.target) }}
  </div>

  <img
    v-if="polarity !== 0"
    style="padding-bottom: 15px; height: 85px"
    :src="explainerGlyphFilepath"
  />
</template>

<script lang="ts">
import { defineComponent, ref, computed, toRefs, PropType, watch } from 'vue';
import { useStore } from 'vuex';
import DropdownControl from '@/components/dropdown-control.vue';
import { STATEMENT_POLARITY, statementPolarityColor } from '@/utils/polarity-util';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import { decodeWeights, Engine, supportsLevelEdges } from '@/services/model-service';
import { CAGModelSummary, EdgeParameter } from '@/types/CAG';
import EdgeWeightDropdownOption from '@/components/drilldown-panel/edge-weight-dropdown-option.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';
import { resolveAssetUrl } from '@/utils/url-util';

const EDGE_TYPE_LEVEL = 'level';
const EDGE_TYPE_TREND = 'trend';

const getEdgeTypeString = (edge: EdgeParameter): string => {
  const param = edge.parameter;
  if (param && param.weights && param.weights.length >= 2) {
    return param.weights[0] > param.weights[1] ? EDGE_TYPE_LEVEL : EDGE_TYPE_TREND;
  }
  return '';
};

const getEdgeWeight = (edge: EdgeParameter): number => {
  const type = getEdgeTypeString(edge);
  const param = edge.parameter;
  if (param && param.weights && param.weights.length >= 2) {
    return type === EDGE_TYPE_TREND ? param.weights[1] : param.weights[0];
  }
  if (param && param.weights && param.weights.length === 0) {
    // Edge is stale
    return -1;
  }
  return 0;
};

const snapEdgeWeightToLowMedHigh = (weight: number): number => {
  if (weight > 0.7) return 0.9;
  if (weight > 0.3) return 0.5;
  return 0.1;
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
    EdgeWeightDropdownOption,
    MessageDisplay,
  },
  emits: ['edge-set-user-polarity', 'edge-set-weights'],
  props: {
    modelSummary: {
      type: Object as PropType<CAGModelSummary>,
      required: true,
    },
    selectedRelationship: {
      type: Object as PropType<EdgeParameter>,
      required: true,
    },
  },
  setup(props) {
    const ontologyFormatter = useOntologyFormatter();
    const store = useStore();
    const currentView = computed(() => store.getters['app/currentView']);

    const { selectedRelationship, modelSummary } = toRefs(props);
    // FIXME: the type of CAGModelParameter.engine should be `Engine` instead of `string`
    const currentEngine = computed(() => modelSummary.value.parameter.engine as Engine);

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

    const currentEdgeType = ref('');
    watch(
      selectedRelationship,
      (_selectedRelationship) => {
        currentEdgeType.value = getEdgeTypeString(_selectedRelationship);
      },
      { immediate: true }
    );

    const currentEdgeWeight = ref(0);
    watch(
      selectedRelationship,
      (_selectedRelationship) => {
        currentEdgeWeight.value = getEdgeWeight(_selectedRelationship);
      },
      { immediate: true }
    );
    const isEdgeWeightStale = computed(() => currentEdgeWeight.value === -1);
    const currentQualitativeWeight = computed(() =>
      snapEdgeWeightToLowMedHigh(currentEdgeWeight.value)
    );

    const engineWeights = computed(() => selectedRelationship.value.parameter?.engine_weights);

    const inferredWeights = computed(() => {
      return engineWeights.value
        ? engineWeights.value[modelSummary.value.parameter.engine]
        : [0, 0];
    });

    const inferredWeightType = computed(() => {
      return decodeWeights(inferredWeights.value).weightType === 'level'
        ? EDGE_TYPE_LEVEL
        : EDGE_TYPE_TREND;
    });

    const inferredWeightValue = computed(() => {
      return decodeWeights(inferredWeights.value).weightValue;
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
      currentQualitativeWeight,
      isEdgeWeightStale,

      inferredWeightType,
      inferredWeightValue,

      typeInconsistency,
      valueInconsistency,

      STATEMENT_POLARITY,
      supportsLevelEdges,
    };
  },
  computed: {
    polarity(): number {
      // Polarity is only undefined on the backend before it's fetched and
      //  computed locally.
      return this.selectedRelationship.polarity as number;
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
      return this.buildExplainerGlyphFilepath(
        this.polarity,
        this.currentQualitativeWeight,
        this.currentEdgeType
      );
    },
    isEdgeWeightEditable(): boolean {
      return this.currentView === 'quantitative' && this.isEdgeWeightStale === false;
    },
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
    currentWeightValueString(currentWeight: number, inferredWeight: number) {
      // FIXME: we currently have no way to determine if the a weight of, say,
      //  0.5 means the analyst selected the inferred weight or "medium",
      //  assuming the inferred value is also 0.5. Assume it's inferred for now.
      const prefix = currentWeight === inferredWeight ? 'an inferred ' : 'a ';
      // Remove the leading "a "
      const magnitudeString = this.weightValueString(currentWeight).split(' ')[1];
      return prefix + magnitudeString;
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

      const fileName =
        'explainerGlyphs/explainerGlyph_' + polarityStr + '_' + weightStr + '_' + typeStr + '.svg';

      return resolveAssetUrl(fileName);
    },
    isInferredValue(dropdownVariable: string, value: string | number) {
      switch (dropdownVariable) {
        case 'edgeType':
          return value === this.inferredWeightType;
        case 'edgeWeight':
          return value === this.inferredWeightValue;
        default:
          return false;
      }
    },
  },
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
