<template>
  <div @click="isEdgeTypeOpen = false; isEdgeWeightOpen = false; isEdgePolarityOpen = false">
    <span
      class="clickable-dropdown"
      @click.stop="openEdgeTypeDropdown()">
      <i class="fa fa-fw fa-bolt" />
      The presence of
      <i class="fa fa-fw fa-caret-down" />
    </span>
    <dropdown-control
      v-if="isEdgeTypeOpen"
      class="edge-type-dropdown">
      <template #content>
        <div class="dropdown-option">The presence of</div>
        <div class="dropdown-option">An increase of</div>
      </template>
    </dropdown-control>
    {{ ontologyFormatter(selectedRelationship.source) }}
    leads to a
    <div style="display: inline-block">
      <span
        class="clickable-dropdown"
        @click.stop="openEdgeWeightDropdown()">
        small
        <i class="fa fa-fw fa-caret-down" />
      </span>
      <dropdown-control
        v-if="isEdgeWeightOpen"
        class="edge-type-dropdown">
        <template #content>
          <div class="dropdown-option"> small </div>
          <div class="dropdown-option"> medium </div>
          <div class="dropdown-option"> large </div>
        </template>
      </dropdown-control>
    </div>
    <div style="display: inline-block">
      <span
        class="clickable-dropdown"
        @click.stop="openEdgePolarityDropdown()">
        increase
        <i class="fa fa-fw fa-caret-down" />
      </span>
      <dropdown-control
        v-if="isEdgePolarityOpen"
        class="edge-type-dropdown">
        <template #content>
          <div class="dropdown-option"> increase </div>
          <div class="dropdown-option"> decrease </div>
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
import { STATEMENT_POLARITY, STATEMENT_POLARITY_MAP, polarityClass, statementPolarityColor } from '@/utils/polarity-util';
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
    polarityClass(): string {
      return polarityClass(this.polarity);
    },
    polarityColor(): { color: string } {
      return statementPolarityColor(this.polarity);
    },
    polarityLabel(): string {
      return STATEMENT_POLARITY_MAP[this.polarity];
    }
  },
  methods: {
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
    togglePolarityDropdown() {
      this.isPolarityDropdownOpen = !this.isPolarityDropdownOpen;
    },
    async onSelectEdgeUserPolarity(polarity: number) {
      this.isPolarityDropdownOpen = false;
      this.$emit('edge-set-user-polarity', this.selectedRelationship, polarity);
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
