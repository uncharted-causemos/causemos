<template>
  <div @click="closeAll()">
    <div
      v-if="selectedRelationship.parameter"
      style="display: inline-block">
      <span
        class="clickable-dropdown"
        @click.stop="openEdgeTypeDropdown()">
        <i class="fa fa-fw fa-bolt" />
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
      leads to
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
          <div class="dropdown-option" @click="setPolarity(1)">increase</div>
          <div class="dropdown-option" @click="setPolarity(-1)">decrease</div>
        </template>
      </dropdown-control>
    </div>
    <div style="display: inline-block">
      in {{ ontologyFormatter(selectedRelationship.target) }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import DropdownControl from '@/components/dropdown-control.vue';
import { STATEMENT_POLARITY, statementPolarityColor } from '@/utils/polarity-util';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import { EdgeParameter } from '@/types/CAG';

const EDGE_TYPE_LEVEL = 'level';
const EDGE_TYPE_TREND = 'trend';

const getEdgeTypeString = (edge: EdgeParameter): string => {
  const param = edge.parameter;
  if (param) {
    return param.weights[0] > 0 ? EDGE_TYPE_LEVEL : EDGE_TYPE_TREND;
  }
  return '';
};


// FIXME: Need better init heuristic because engine numbers are not discrete??
const getEdgeWeight = (edge: EdgeParameter): number => {
  const type = getEdgeTypeString(edge);
  const param = edge.parameter;
  if (param) {
    const w = type === EDGE_TYPE_TREND ? param.weights[0] : param.weights[1];
    if (w > 0.7) return 0.9;
    if (w > 0.3) return 0.5;
    return 0.1;
  }
  return 0;
};


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
    const isPolarityDropdownOpen = ref(false);
    const ontologyFormatter = useOntologyFormatter();

    const isEdgeTypeOpen = ref(false);
    const isEdgeWeightOpen = ref(false);
    const isEdgePolarityOpen = ref(false);

    const currentEdgeType = ref(getEdgeTypeString(props.selectedRelationship as EdgeParameter));
    const currentEdgeWeight = ref(getEdgeWeight(props.selectedRelationship as EdgeParameter));

    return {
      ontologyFormatter,
      isPolarityDropdownOpen,
      isEdgeTypeOpen,
      isEdgeWeightOpen,
      isEdgePolarityOpen,

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
    }
  },
  methods: {
    closeAll() {
      this.isEdgeTypeOpen = false;
      this.isEdgeWeightOpen = false;
      this.isEdgePolarityOpen = false;
    },
    openEdgeTypeDropdown() {
      this.isEdgeTypeOpen = true;
      this.isEdgeWeightOpen = false;
      this.isEdgePolarityOpen = false;
    },
    openEdgeWeightDropdown() {
      this.isEdgeTypeOpen = false;
      this.isEdgeWeightOpen = true;
      this.isEdgePolarityOpen = false;
    },
    openEdgePolarityDropdown() {
      this.isEdgeTypeOpen = false;
      this.isEdgeWeightOpen = false;
      this.isEdgePolarityOpen = true;
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
    togglePolarityDropdown() {
      this.isPolarityDropdownOpen = !this.isPolarityDropdownOpen;
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

.polarity-button {
  font-weight: normal;
}

.edge-type-dropdown,
.polarity-dropdown {
  font-size: $font-size-medium;
  font-weight: normal;
  cursor: default;
  position: absolute;
  margin: -10px 0 0 4px;
}

.polarity-label {
  padding: 5px;
}

.polarity-same {
  color: $positive;
}
.polarity-opposite {
  color: $negative;
}

</style>
