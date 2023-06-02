<template>
  <div class="index-projection-settings-countries-container">
    <p>Countries</p>
    <ul class="country-list">
      <li class="country-item flex" v-for="(country, i) in countries" :key="country.name">
        <button class="btn btn-sm color-box">
          <div :style="{ 'background-color': country.color }"></div>
        </button>
        <DropdownButton
          class="flex-grow dropdown"
          :is-dropdown-left-aligned="true"
          :items="selectableCountries"
          :selected-item="country.name"
          :is-warning-state-active="country.name === NO_COUNTRY_SELECTED_VALUE"
          @item-selected="(newCountry: string) => emit('change', i, newCountry)"
        />
        <!-- Must always have at least two countries -->
        <button v-if="countries.length > 2" class="btn btn-sm" @click="emit('remove', i)">
          <i class="fa fa-minus" />
        </button>
      </li>
    </ul>
    <button
      class="btn btn-sm add-country-button"
      :class="{ disabled: maxCountries === countries.length }"
      @click="emit('add')"
    >
      <i class="fa fa-fw fa-plus" />Add country
    </button>
  </div>
</template>
<script setup lang="ts">
import { IndexProjectionCountry } from '@/types/Index';
import { NO_COUNTRY_SELECTED_VALUE } from '@/utils/index-projection-util';
import DropdownButton, { DropdownItem } from '../dropdown-button.vue';

defineProps<{
  countries: IndexProjectionCountry[];
  selectableCountries: DropdownItem[];
  maxCountries: number;
}>();

const emit = defineEmits<{
  (e: 'add'): void;
  (e: 'remove', arrayPosition: number): void;
  (e: 'change', arrayPosition: number, newCountry: string): void;
}>();
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';

$row-height: 26px;

.country-list {
  list-style: none;
  padding-left: 0;
  margin-top: 10px;
}
.country-item {
  margin-bottom: 10px;
  gap: 2px;
  align-items: center;

  .btn {
    padding: 2px;
    width: $row-height;
    height: $row-height;
  }
}

.color-box div {
  width: 100%;
  height: 100%;
}

.dropdown :deep(button) {
  width: 100%;
  height: $row-height;
}

.add-country-button {
  width: 100%;
}
</style>
