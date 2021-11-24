<template>
  <div @click="closeAll()">
    <div
      v-if="selectedRelationship.parameter"
      style="display: inline-block">
      <span
        class="clickable-dropdown"
        @click.stop="openEdgeTypeDropdown()">
        <i class="fa fa-fw fa-bolt" />
        {{ edgeType }}
        <i class="fa fa-fw fa-caret-down" />
      </span>
      <dropdown-control
        v-if="isEdgeTypeOpen"
        class="edge-type-dropdown">
        <template #content>
          <div class="dropdown-option" @click="setType('level')">The presence of</div>
          <div class="dropdown-option" @click="setType('trend')">An increase of</div>
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
        {{ edgeWeight }}
        <i class="fa fa-fw fa-caret-down" />
      </span>
      <dropdown-control
        v-if="isEdgeWeightOpen"
        class="edge-type-dropdown">
        <template #content>
          <div class="dropdown-option" @click="setWeight(0.1)">a small </div>
          <div class="dropdown-option" @click="setWeight(0.5)">a medium </div>
          <div class="dropdown-option" @click="setWeight(0.9)">a large </div>
        </template>
      </dropdown-control>
    </div>
    <div style="display: inline-block">
      <span
        class="clickable-dropdown"
        @click.stop="openEdgePolarityDropdown()">
        &nbsp;{{ polarityLabel }} &nbsp;
        <i class="fa fa-fw fa-caret-down" />
      </span>
      <dropdown-control
        v-if="isEdgePolarityOpen"
        class="edge-type-dropdown">
        <template #content>
          <div class="dropdown-option" @click="setPolarity(1)"> increase </div>
          <div class="dropdown-option" @click="setPolarity(-1)"> decrease </div>
        </template>
      </dropdown-control>
    </div>
    <div style="display: inline-block">
      in {{ ontologyFormatter(selectedRelationship.target) }}
    </div>
  </div>
  <!--
  <br>
  <div>
    <button
      class="btn polarity-button"
      @click="togglePolarityDropdown">
      <i
        :class="polarityClass"
        :style="polarityColor"
      />
      <span class="polarity-label">Polarity: {{ polarityLabel }}</span>
      <i
        class="fa"
        :class="{'fa-angle-down': !isPolarityDropdownOpen, 'fa-angle-up': isPolarityDropdownOpen}"
      />
    </button>
    <dropdown-control
      v-if="isPolarityDropdownOpen"
      class="polarity-dropdown">
      <template #content>
        <div
          class="dropdown-option"
          @click="onSelectEdgeUserPolarity(STATEMENT_POLARITY.SAME)">
          <span class="polarity-same">Same</span>
        </div>
        <div
          class="dropdown-option"
          @click="onSelectEdgeUserPolarity(STATEMENT_POLARITY.OPPOSITE)">
          <span class="polarity-opposite">Opposite</span>
        </div>
      </template>
    </dropdown-control>
  </div>
  -->
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import DropdownControl from '@/components/dropdown-control.vue';
import { STATEMENT_POLARITY, statementPolarityColor } from '@/utils/polarity-util';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';

export default defineComponent({
  name: 'EdgePolaritySwitcher',
  components: {
    DropdownControl
  },
  emits: ['edge-set-user-polarity'],
  props: {
    selectedRelationship: {
      type: Object,
      required: true
    }
  },
  setup() {
    const isPolarityDropdownOpen = ref(false);
    const ontologyFormatter = useOntologyFormatter();

    const isEdgeTypeOpen = ref(false);
    const isEdgeWeightOpen = ref(false);
    const isEdgePolarityOpen = ref(false);

    return {
      ontologyFormatter,
      isPolarityDropdownOpen,
      isEdgeTypeOpen,
      isEdgeWeightOpen,
      isEdgePolarityOpen,

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
    edgeType(): string {
      const param = this.selectedRelationship.parameter;
      if (param) {
        return param.weights[0] > 0 ? 'The presence of' : 'An increase of';
      }
      return '';
    },
    edgeWeight(): string {
      const param = this.selectedRelationship.parameter;
      // FIXME: Need better init
      if (param) {
        const w = param.weights[0] > 0 ? param.weights[0] : param.weights[1];
        if (w > 0.7) return 'a large';
        if (w > 0.3) return 'a medium';
        return 'a small';
      }
      return '';
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
    setPolarity(v: number) {
      this.$emit('edge-set-user-polarity', this.selectedRelationship, v);
    },
    setWeight(v: number) {
      console.log(v);
    },
    setType(v: string) {
      console.log(v);
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
