<template>
  <div class="date-dropdown-container">
    <!-- Month -->
    <div class="date-dropdown-selector">
      <select
        v-model="selectedMonth"
        class="form-control input-sm"
        @change="update">
        <option
          v-for="(month, index) in months"
          :key="month"
          :value="index">
          {{ month }}
        </option>
      </select>
    </div>

    <!-- Year -->
    <div class="date-dropdown-selector">
      <select
        v-model="selectedYear"
        class="form-control input-sm"
        @change="update">
        <option
          v-for="(year, index) in years"
          :key="index"
          :value="year">
          {{ year }}
        </option>
      </select>
    </div>
  </div>
</template>


<script lang="ts">
import moment from 'moment';
import _ from 'lodash';
import { defineComponent } from 'vue';

const DEFAULT_MONTHS = {
  0: 'Jan',
  1: 'Feb',
  2: 'Mar',
  3: 'Apr',
  4: 'May',
  5: 'Jun',
  6: 'Jul',
  7: 'Aug',
  8: 'Sep',
  9: 'Oct',
  10: 'Nov',
  11: 'Dec'
};

const MIN_YEAR = 1990;
const MAX_YEAR = 2021;

export default defineComponent({
  name: 'DateDropdown',
  props: {
    data: {
      type: Number,
      default: () => (0) // timestamp in millis
    }
  },
  data: () => ({
    selectedMonth: 0, // January by default
    selectedYear: MAX_YEAR
  }),
  computed: {
    // Computes a list of month.
    months() {
      return Object.values(DEFAULT_MONTHS);
    },
    // Computes a list of years.
    years() {
      return _.range(MAX_YEAR, MIN_YEAR);
    }
  },
  mounted() {
    const m = moment.utc(this.data);
    this.selectedMonth = m.month();
    this.selectedYear = m.year();
  },
  methods: {
    update() {
      const timestamp = moment.utc({ y: this.selectedYear, M: this.selectedMonth }).valueOf();
      this.$emit('updated', timestamp);
    }
  }
});
</script>

<style scoped>
.date-dropdown-container {
  display: flex;
}
.date-dropdown-selector {
  display: flex;
  margin-right: 5px;
}
</style>
