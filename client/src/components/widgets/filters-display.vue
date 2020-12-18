<template>
  <div class="filters-display">
    <div
      v-for="(clause, cIdx) of filters.clauses"
      :key="cIdx"
      class="filters-clause">
      <div class="clause-values">
        <div
          v-for="(value, vIdx) of clause.values"
          :key="vIdx"
          class="label label-default">
          {{ clause.field | filter-key-formatter }}
          {{ clause.isNot ? 'is not: ' : 'is: ' }}
          {{ value | filter-value-formatter(clause.field) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import FiltersUtil from '@/utils/filters-util';

export default {
  name: 'FiltersDisplay',
  props: {
    filters: {
      type: Object,
      default: FiltersUtil.newFilters()
    }
  }
};
</script>

<style lang="scss" scoped>
.filters-display {
  margin-top: 12px;
  margin-bottom: 12px;
  overflow-y: scroll;
  max-height: 50vh;
}

.filters-clause {
  display: flex;
  flex-direction: row;
  margin: 5px;

  .clause-values {
    display: flex;
    flex-wrap: wrap;
    .label {
      white-space: initial;
      padding: 5px;
    }
  }
}
</style>
