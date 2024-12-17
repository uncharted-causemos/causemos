<template>
  <div class="index-projection-settings-countries-container">
    <p>Countries</p>
    <ul class="country-list">
      <li class="country-item flex" v-for="(country, i) in countries" :key="country.name">
        <div class="color-box" :style="{ 'background-color': country.color }" />
        <Select
          class="flex-grow"
          :options="selectableCountries"
          :model-value="country.name"
          option-label="displayName"
          option-value="value"
          placeholder="Select a country"
          :invalid="country.name === NO_COUNTRY_SELECTED_VALUE"
          @update:model-value="(newCountry: string) => emit('change', i, newCountry)"
        />
        <!-- Must always have at least two countries -->
        <Button
          v-if="countries.length > 2"
          icon="fa fa-minus"
          @click="emit('remove', i)"
          severity="secondary"
        />
      </li>
    </ul>
    <Button
      class="w-100"
      icon="fa fa-plus"
      :class="{ disabled: maxCountries === countries.length }"
      @click="emit('add')"
      label="Add country"
      severity="secondary"
    />
  </div>
</template>
<script setup lang="ts">
import { IndexProjectionCountry } from '@/types/Index';
import { NO_COUNTRY_SELECTED_VALUE } from '@/utils/index-projection-util';
import { DropdownItem } from '../dropdown-button.vue';
import Select from 'primevue/select';
import Button from 'primevue/button';

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

.index-projection-settings-countries-container {
  --scenario-color-width: 10px;
  --scenario-color-gap: 5px;
}

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

.color-box {
  width: var(--scenario-color-width);
  height: var(--scenario-color-width);
  border-radius: 200%;
  margin-right: var(--scenario-color-gap);
}

.dropdown :deep(button) {
  width: 100%;
  height: $row-height;
}
</style>
