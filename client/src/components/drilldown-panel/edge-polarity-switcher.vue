<template>
  <div @click="closeAll()">
    <div
      v-if="selectedRelationship.parameter"
      style="display: inline-block">
      <span
        class="clickable-dropdown"
        @click.stop="openEdgeTypeDropdown()">
        <i v-if="currentEdgeType === 'level'" class="fa fa-fw fa-bolt" />
        {{ weightTypeString(currentEdgeType) }}
        <i class="fa fa-fw fa-caret-down" />
      </span>
      <dropdown-control
        v-if="isEdgeTypeOpen"
        class="edge-type-dropdown">
        <template #content>
          <div class="dropdown-option" @click="setType('level')">{{ weightTypeString('level') }}</div>
          <div class="dropdown-option" @click="setType('trend')">{{ weightTypeString('trend') }}</div>
        </template>
      </dropdown-control>
    </div>
    <div style="display: inline-block">
      {{ ontologyFormatter(selectedRelationship.source) }}
      leads to&nbsp;
    </div>
    <div
      v-if="selectedRelationship.parameter"
      style="display: inline-block">
      <span
        class="clickable-dropdown"
        @click.stop="openEdgeWeightDropdown()">
        {{ weightValueString(currentEdgeWeight) }}
        <i class="fa fa-fw fa-caret-down" />
      </span>
      <dropdown-control
        v-if="isEdgeWeightOpen"
        class="edge-type-dropdown">
        <template #content>
          <div class="dropdown-option" @click="setWeight(0.1)">{{ weightValueString(0.1) }}</div>
          <div class="dropdown-option" @click="setWeight(0.5)">{{ weightValueString(0.5) }}</div>
          <div class="dropdown-option" @click="setWeight(0.9)">{{ weightValueString(0.9) }}</div>
        </template>
      </dropdown-control>
    </div>
    <div style="display: inline-block">
      <span
        class="clickable-dropdown"
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
  <img v-if="polarity !== 0" :src="explainerGlyphFilepath">
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import DropdownControl from '@/components/dropdown-control.vue';
import { STATEMENT_POLARITY, statementPolarityColor } from '@/utils/polarity-util';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import { EdgeParameter } from '@/types/CAG';

const EDGE_TYPE_LEVEL = 'level';
const EDGE_TYPE_TREND = 'trend';

const getEdgeTypeString = (edge: EdgeParameter): string => {
  const param = edge.parameter;
  if (param) {
    return param.weights[0] > param.weights[1] ? EDGE_TYPE_LEVEL : EDGE_TYPE_TREND;
  }
  return '';
};


// FIXME: Need better init heuristic because engine numbers are not discrete??
const getEdgeWeight = (edge: EdgeParameter): number => {
  const type = getEdgeTypeString(edge);
  const param = edge.parameter;
  if (param) {
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
    DropdownControl
  },
  emits: ['edge-set-user-polarity', 'edge-set-weights'],
  props: {
    selectedRelationship: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const ontologyFormatter = useOntologyFormatter();

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

    return {
      ontologyFormatter,
      isEdgeTypeOpen,
      isEdgeWeightOpen,
      isEdgePolarityOpen,
      dropDown,

      currentEdgeType,
      currentEdgeWeight,

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
      if (v === 0.9) return 'a large';
      if (v === 0.5) return 'a medium';
      return 'a small';
    },
    weightTypeString(v: string): string {
      if (v === EDGE_TYPE_LEVEL) return 'The presence of';
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

      if (this.weightValueString(edgeWeight) === 'a large') weightStr = 'l';
      else if (this.weightValueString(edgeWeight) === 'a medium') weightStr = 'm';

      const fileName = 'explainerGlyphs/explainerGlyph_' + polarityStr + '_' + weightStr + '_' + typeStr + '.svg';

      const assetFolder = require.context('@/assets/');
      return assetFolder('./' + fileName);
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
  margin: -10px 0 0 4px;
}

.polarity-same {
  color: $positive;
}
.polarity-opposite {
  color: $negative;
}
</style>
