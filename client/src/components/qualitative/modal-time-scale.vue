<template>
  <modal @close="save" :sticky="true">
    <template #header>
    </template>
    <template #body>
      <h2 class="header-question">Which time scale are you interested in?</h2>
      <div
        v-for="timeScaleOption in TIME_SCALE_OPTIONS"
        :key="timeScaleOption.id"
        class="time-scale-option"
      >
        <input
          type="radio"
          :id="timeScaleOption.id"
          :value="timeScaleOption.id"
          v-model="selectedTimeScaleOption"
        />
        <label class="label-column" :for="timeScaleOption.id">
          <h3>{{ timeScaleOption.label }}</h3>
          <h4>See change in value</h4>
          <p>
            {{
              timeScaleOption.timeSlices.map(slice => 'in ' + slice.label).join(', ')
            }}
          </p>
          <div class="label-row">
            <h4>Example</h4>
            <p>{{ timeScaleOption.example }}</p>
          </div>
        </label>
      </div>

      <div>
        <h2 class="header-question">Which country are you interested in?</h2>
        <auto-complete
          :focus-input="true"
          :style-results="true"
          :placeholder-color="'gray'"
          :placeholder-message="'Type region name...'"
          :search-fn="searchRegions"
          @item-selected="selectCountry"
        />
      </div>
      <div>
        <h2 class="header-question">Default engine:&nbsp;
        <select v-model="selectedEngine">
          <option value="dyse"> DySE </option>
          <option value="delphi"> Delphi </option>
          <option value="sensei"> Sensei </option>
        </select>
        </h2>
      </div>
    </template>
    <template #footer>
      <button
        type="button"
        class="btn btn-call-to-action"
        @click.stop="save"
      >
        Save
      </button>
    </template>
  </modal>
</template>

<script lang="ts">
import _ from 'lodash';
import { TimeScale, DatacubeGeoAttributeVariableType } from '@/types/Enums';
import { TIME_SCALE_OPTIONS } from '@/utils/time-scale-util';
import { defineComponent, PropType, ref, toRefs } from 'vue';
import modal from '../modals/modal.vue';
import AutoComplete from '@/components/widgets/autocomplete/autocomplete.vue';
import { getGADMSuggestions } from '@/services/suggestion-service';
import { RegionalGADMDetail } from '@/types/Common';
import { REGION_ID_DISPLAY_DELIMETER } from '@/utils/admin-level-util';

export default defineComponent({
  components: {
    modal,
    AutoComplete
  },
  name: 'ModalTimeScale',
  emits: ['save-cag-params'],
  props: {
    initiallySelectedTimeScale: {
      type: String as PropType<string | null>,
      default: null
    }
  },
  setup(props) {
    const { initiallySelectedTimeScale } = toRefs(props);
    return {
      TIME_SCALE_OPTIONS,
      selectedTimeScaleOption: ref(
        initiallySelectedTimeScale.value ?? TimeScale.Months
      ),
      selectedCountry: ref<string | null>(null),
      selectedEngine: ref<string | null>('dyse')
    };
  },
  methods: {
    save() {
      this.$emit('save-cag-params', {
        engine: this.selectedEngine,
        timeScale: this.selectedTimeScaleOption,
        geography: _.isEmpty(this.selectedCountry) ? undefined : this.selectedCountry
      });
    },
    getGADMName(item: RegionalGADMDetail, delimter: string) {
      return Object.values(DatacubeGeoAttributeVariableType).filter(l => item[l] !== undefined).map(l => item[l]).join(delimter);
    },
    searchRegions(query: string) {
      return new Promise(resolve => {
        let suggestionResults: string[] = [];

        if (query.length < 1) resolve(suggestionResults); // early exit

        const level = 'country';
        const debouncedFetchFunction = getGADMSuggestions(level, query);
        const fetchedResults = debouncedFetchFunction(); // NOTE: a debounced function may return undefined
        if (fetchedResults !== undefined) {
          fetchedResults.then((res) => {
            suggestionResults = res.map(item => {
              const regionLabel = this.getGADMName(item, REGION_ID_DISPLAY_DELIMETER);
              return regionLabel; // this will be displayed in the autocomplete dropdown
            });
            resolve(suggestionResults);
          });
        } else {
          resolve(suggestionResults);
        }
      });
    },
    selectCountry(v: string) {
      this.selectedCountry = v;
    }
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.header-question {
  font-size: $font-size-extra-large;
  font-weight: normal;
  line-height: $font-size-extra-large;
}

.time-scale-option {
  display: flex;

  &:not(:first-child) {
    margin-top: 10px;
  }
}

.label-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  margin-left: 5px;
  cursor: pointer;

  h3,
  h4,
  p {
    margin: 0;
  }

  h3 {
    font-size: $font-size-large;
    font-weight: normal;
    margin-bottom: 5px;
  }

  h4 {
    @include header-secondary;
  }
}

.label-row {
  display: flex;
  margin-top: 5px;

  & > *:not(:first-child) {
    margin-left: 5px;
  }
}
</style>
