<template>
  <div class="date-dropdown-container">
    <!-- Month -->
    <dropdown-button
      :items="MONTHS"
      :selected-item="selectedMonth"
      :is-dropdown-above="true"
      :is-dropdown-left-aligned="true"
      @item-selected="setSelectedMonth"
    />

    <!-- Year -->
    <dropdown-button
      :items="years"
      :selected-item="selectedYear"
      :is-dropdown-above="true"
      :is-dropdown-left-aligned="true"
      @item-selected="setSelectedYear"
    />
  </div>
</template>

<script lang="ts">
import moment from 'moment';
import _ from 'lodash';
import { defineComponent } from 'vue';
import dropdownButton, { DropdownItem } from '../dropdown-button.vue';

const MONTHS: DropdownItem[] = [
  { value: 0, displayName: 'Jan' },
  { value: 1, displayName: 'Feb' },
  { value: 2, displayName: 'Mar' },
  { value: 3, displayName: 'Apr' },
  { value: 4, displayName: 'May' },
  { value: 5, displayName: 'Jun' },
  { value: 6, displayName: 'Jul' },
  { value: 7, displayName: 'Aug' },
  { value: 8, displayName: 'Sep' },
  { value: 9, displayName: 'Oct' },
  { value: 10, displayName: 'Nov' },
  { value: 11, displayName: 'Dec' }
];

const MIN_YEAR = 1990;
const MAX_YEAR = 2022;

export default defineComponent({
  components: { dropdownButton },
  name: 'DateDropdown',
  props: {
    data: {
      type: Number,
      default: () => 0 // timestamp in millis
    }
  },
  emits: ['date-updated'],
  data: () => ({
    selectedMonth: 0, // January by default
    selectedYear: MAX_YEAR,
    MONTHS
  }),
  computed: {
    years(): DropdownItem[] {
      return _.range(MAX_YEAR, MIN_YEAR).map(year => ({
        displayName: year.toString(),
        value: year
      }));
    }
  },
  mounted() {
    const m = moment.utc(this.data);
    this.selectedMonth = m.month();
    this.selectedYear = m.year();
  },
  methods: {
    setSelectedMonth(month: number) {
      this.selectedMonth = month;
      this.update();
    },
    setSelectedYear(year: number) {
      this.selectedYear = year;
      this.update();
    },
    update() {
      const timestamp = moment
        .utc({ y: this.selectedYear, M: this.selectedMonth })
        .valueOf();
      this.$emit('date-updated', timestamp);
    }
  }
});
</script>

<style scoped>
.date-dropdown-container {
  display: flex;
  gap: 5px;
}
</style>
