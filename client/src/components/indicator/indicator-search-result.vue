<template>
  <div
    class="indicator-search-result-container"
    @click="onClick"
  >
    <span class="column column--double">{{ name }}</span>
    <span class="column">{{ units }}</span>
    <span class="column">{{ model }}</span>
    <span class="column">{{ countries }}</span>
    <span class="column">{{ adminLevels }}</span>
    <span class="column">{{ period }}</span>
  </div>
</template>

<script>
import dateFormatter from '@/formatters/date-formatter';

const VALUE_MISSING_FALLBACK = '--';

export default {
  name: 'IndicatorSearchResult',
  props: {
    indicatorData: {
      type: Object,
      required: true
    }
  },
  emits: ['onSelected'],
  computed: {
    name() {
      return this.indicatorData.output_name || VALUE_MISSING_FALLBACK;
    },
    units() {
      return this.indicatorData.output_units || VALUE_MISSING_FALLBACK;
    },
    model() {
      return this.indicatorData.model || VALUE_MISSING_FALLBACK;
    },
    countries() {
      const all = this.indicatorData.country;
      if (all.length === 0) return VALUE_MISSING_FALLBACK;
      if (all.length === 1) return all[0];
      // HACK: Ideally we would display a country that's present in their search
      //  if it exists, not necessarily Ethiopia.
      const display = all.includes('Ethiopia') ? 'Ethiopia' : all[0];
      return `${display} (+${all.length - 1})`;
    },
    adminLevels() {
      const validLevels = [];
      if (this.indicatorData.country && this.indicatorData.country.length > 0) {
        validLevels.push('L0');
      }
      for (let i = 1; i < 6; i++) {
        // e.g. this.indicatorData.admin1
        const property = this.indicatorData['admin' + i];
        if (property && property.length > 0) {
          validLevels.push('L' + i);
        }
      }
      if (validLevels.length === 0) return VALUE_MISSING_FALLBACK;
      if (validLevels.length === 1) return validLevels[0];
      return validLevels.join(', ');
    },
    period() {
      const { period: periods } = this.indicatorData;
      if (!periods || periods.length === 0) return VALUE_MISSING_FALLBACK;
      const formatter = value => dateFormatter(Number.parseInt(value), 'MMMYYYY');
      return periods
        .map(period => `${formatter(period.gte)} - ${formatter(period.lte)}`)
        .join(' ');
    }
  },
  methods: {
    onClick() {
      this.$emit('onSelected', this.indicatorData);
    }
  }
};
</script>

<style lang="scss" scoped>
  @import "~styles/variables";

  .indicator-search-result-container {
    display: flex;

    &:not(:nth-child(2)) {
      border-top: 1px solid $separator;
    }
  }

  .column {
    flex: 1;
    &:not(:last-child) {
      padding-right: 5px;
    }
  }

  .column--double {
    flex-grow: 2;
  }
</style>
