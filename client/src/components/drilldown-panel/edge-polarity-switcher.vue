<template>
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
      <div slot="content">
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
      </div>
    </dropdown-control>
  </div>
</template>

<script>
import DropdownControl from '@/components/dropdown-control';
import { STATEMENT_POLARITY, STATEMENT_POLARITY_MAP, polarityClass, statementPolarityColor } from '@/utils/polarity-util';

export default {
  name: 'EdgePolaritySwitcher',
  components: {
    DropdownControl
  },
  props: {
    selectedRelationship: {
      type: Object,
      required: true
    }
  },
  data: () => ({
    isPolarityDropdownOpen: false
  }),
  computed: {
    polarity() {
      return this.selectedRelationship.polarity;
    },
    polarityClass() {
      return polarityClass(this.polarity);
    },
    polarityColor() {
      return statementPolarityColor(this.polarity);
    },
    polarityLabel() {
      return STATEMENT_POLARITY_MAP[this.polarity];
    }
  },
  created() {
    this.STATEMENT_POLARITY = STATEMENT_POLARITY;
  },
  methods: {
    togglePolarityDropdown() {
      this.isPolarityDropdownOpen = !this.isPolarityDropdownOpen;
    },
    async onSelectEdgeUserPolarity(polarity) {
      this.isPolarityDropdownOpen = false;
      this.$emit('edge-set-user-polarity', this.selectedRelationship, polarity);
    }

  }
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.polarity-button {
  margin-bottom: 10px;
  font-weight: normal;
}

.polarity-dropdown {
  font-size: 14px;
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
