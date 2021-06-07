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
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import DropdownControl from '@/components/dropdown-control.vue';
import { STATEMENT_POLARITY, STATEMENT_POLARITY_MAP, polarityClass, statementPolarityColor } from '@/utils/polarity-util';

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

    return {
      isPolarityDropdownOpen,
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

.polarity-button {
  margin-bottom: 10px;
  font-weight: normal;
}

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
