<template>
  <modal
    class="modal-edit-indicator-container"
    :show-close-button="true"
    @close="close">
    <template #header>
      <h4 class="header">
        <!-- FIXME: our version of Font-Awesome doesn't include this icon -->
        <i class="fa fa-fw fa-chart-line" />
        Quantify Concept{{ headerSuffix }}
      </h4>
    </template>
    <template #body>
      <!-- TODO: search indicator icon -->
      <!-- TODO: can we extract a standard search-bar component? I think we have a few in the app -->
      <div
        class="search-bar"
        @focusin="setIsAlternativeDropdownOpen(true)"
        @focusout="onSearchFocusOut"
      >
        <input
          v-model="searchText"
          class="form-control"
          type="text"
          placeholder="Search all indicators..."
          @keyup.enter="searchForAlternatives"
        >
        <dropdown-control
          v-if="isAlternativeDropdownOpen"
          class="alternative-dropdown"
        >
          <template #content>
            <indicator-search-header
              v-if="visibleAlternatives.length > 0"
            />
            <span
              v-else
              class="no-results"
            >
              No results were found.
            </span>
            <!-- tabindex is required so that focusout events
            include this element in event.relatedTarget -->
            <indicator-search-result
              v-for="(alternative, index) of visibleAlternatives"
              :key="alternative._vue_key"
              :indicator-data="alternative"
              :tabindex="index"
              class="dropdown-option"
              @onSelected="selectAlternative(alternative)"
            >
              {{ alternative.output_name }}
            </indicator-search-result>
          </template>
        </dropdown-control>
      </div>
      <indicator-editor
        v-if="selectedIndicator !== null"
        :indicator="selectedIndicator"
        :initial-indicator-parameters="selectedIndicatorParameters"
        :model-summary="modelSummary"
        @parameter-change="onParameterChange"
      />
      <message-display
        v-else
        class="no-indicator-message"
        :message="messageNoIndicator"
      />
    </template>
    <template #footer>
      <div
        class="btn btn-primary btn-call-for-action"
        @click="save"
      >
        Save
      </div>
    </template>
  </modal>
</template>

<script>
import _ from 'lodash';
import { getDatacubes } from '@/services/datacube-service';

import IndicatorEditor from '@/components/indicator/indicator-editor';
import Modal from '@/components/modals/modal';
import DropdownControl from '@/components/dropdown-control';
import MessageDisplay from '@/components/widgets/message-display';
import filtersUtil from '@/utils/filters-util';
import IndicatorSearchResult from '@/components/indicator/indicator-search-result';
import IndicatorSearchHeader from '@/components/indicator/indicator-search-header';
import { INDICATOR } from '@/utils/messages-util';

export default {
  name: 'EditIndicatorModal',
  components: {
    Modal,
    DropdownControl,
    MessageDisplay,
    IndicatorEditor,
    IndicatorSearchResult,
    IndicatorSearchHeader
  },
  props: {
    nodeData: {
      type: Object,
      required: true
    },
    modelSummary: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'save'],
  data: () => ({
    // Contains metadata for the currently selected indicator
    selectedIndicator: null,
    // Contains the selected region at each admin level, selected unit, and function
    selectedIndicatorParameters: null,
    defaultAlternatives: [],
    indicatorAlternatives: [],
    isAlternativeDropdownOpen: false,
    searchText: '',
    newIndicatorParameters: null,
    messageNoIndicator: INDICATOR.EDITOR_NO_INDICATOR
  }),
  computed: {
    headerSuffix() {
      if (_.isNil(this.nodeData)) return;
      return ` - ${this.nodeData.label}`;
    },
    visibleAlternatives() {
      // Don't display the currently selected indicator in the list
      const noneSelected = this.hasNoIndicator;
      const alternatives = this.indicatorAlternatives.filter(indicator => noneSelected ||
        indicator.variable !== this.selectedIndicator.variable ||
        indicator.model !== this.selectedIndicator.model ||
        indicator.output_units !== this.selectedIndicator.output_units);

      // Add a unique key that vue can use for displaying in list
      return _.sortBy(alternatives.map(a => {
        return {
          ...a,
          // TODO: Remove unit once we handle multiple units per indicator
          _vue_key: `${a.model}-${a.variable}-${a.output_units}`
        };
      }), '_search_score').reverse();
    },
    hasNoIndicator() {
      return _.isEmpty(this.selectedIndicator && this.selectedIndicator.variable);
    },
    fullSavePayload() {
      const {
        selectedUnit,
        selectedCountry,
        selectedAdmin1,
        selectedAdmin2,
        timeseries,
        aggregatedTimeseriesValue
      } = this.newIndicatorParameters;
      return {
        indicator_id: this.selectedIndicator.variable,
        indicator_name: this.selectedIndicator.output_name,
        indicator_source: this.selectedIndicator.model,
        indicator_score: this.selectedIndicator._search_score,
        indicator_time_series: timeseries,
        indicator_time_series_parameter: {
          unit: selectedUnit,
          country: selectedCountry,
          admin1: selectedAdmin1,
          admin2: selectedAdmin2
        },
        initial_value: aggregatedTimeseriesValue,
        initial_value_parameter: {
          func: _.get(this.selectedIndicatorParameters, 'initial_value_parameter.func') || null
        }
      };
    }
  },
  watch: {
    searchText() {
      this.throttledSearch();
    }
  },
  mounted() {
    this.fetchInitialMetadata();
    this.fetchDefaultAlternatives();
  },
  methods: {
    close() {
      this.$emit('close');
    },
    save() {
      this.$emit('save', this.fullSavePayload);
      this.close();
    },
    async fetchInitialMetadata() {
      const savedParameters = _.get(this.nodeData, 'parameter') || null;
      const {
        indicator_id: variable,
        indicator_source: model,
        indicator_time_series_parameter: indicatorTimeSeriesParameter
      } = savedParameters;
      if (_.isNil(variable) || _.isNil(model)) {
        this.selectedIndicator = null;
        this.selectedIndicatorParameters = null;
        return;
      }
      const unit = _.get(indicatorTimeSeriesParameter, 'unit', null);
      const filters = filtersUtil.newFilters();
      filtersUtil.addSearchTerm(filters, 'variable', variable, 'and', false);
      filtersUtil.addSearchTerm(filters, 'model', model, 'and', false);
      filtersUtil.addSearchTerm(filters, 'type', 'indicator', 'and', false);
      if (unit) {
        filtersUtil.addSearchTerm(filters, 'output_units', unit, 'and', false);
      }
      let indicators;
      try {
        indicators = await getDatacubes(filters);
      } catch (e) {
        console.error('Failed to fetch initial metadata');
        return;
      }
      if (indicators.length > 1 && !_.isNil(unit)) {
        indicators = indicators.filter(i => i.output_units === unit);
      }
      if (indicators.length === 1) {
        this.selectedIndicatorParameters = savedParameters;
        this.selectedIndicator = indicators[0];
      }
    },
    async fetchDefaultAlternatives() {
      const concept = this.nodeData.concept;
      const filters = filtersUtil.newFilters();
      filtersUtil.addSearchTerm(filters, 'concepts.name', concept, 'or', false);
      filtersUtil.addSearchTerm(filters, 'type', 'indicator', 'or', false);
      try {
        this.indicatorAlternatives = await getDatacubes(filters);
      } catch (e) {
        console.error('Failed to fetch indicator suggestions');
        return;
      }
      if (_.isEmpty(this.visibleAlternatives)) {
        await this.searchForAlternatives(this.nodeData.label);
      }
      // Cache these suggestions for when search is cleared
      this.defaultAlternatives = this.indicatorAlternatives;
    },
    async searchForAlternatives(overrideSearchText) {
      const override = _.isString(overrideSearchText) && overrideSearchText;
      if (!override && this.searchText === '') {
        this.indicatorAlternatives = this.defaultAlternatives;
        return;
      }

      const text = override || this.searchText;
      const filters = filtersUtil.newFilters();
      filtersUtil.addSearchTerm(filters, '_search', text, 'and', false);
      filtersUtil.addSearchTerm(filters, 'type', 'indicator', 'or', false);
      try {
        this.indicatorAlternatives = await getDatacubes(filters);
      } catch (e) {
        console.error('Failed to search for indicator suggestions');
      }
    },
    throttledSearch: _.throttle(function() {
      if (this.isAlternativeDropdownOpen) {
        this.searchForAlternatives();
      }
    }, 500, { trailing: true, leading: false }),
    onSearchFocusOut(event) {
      // Don't close the dropdown as soon as the searchbox is blurred
      //  when we click one of the search results. Doing so would close
      //  the dropdown before the click handler is activated
      if (event.currentTarget.contains(event.relatedTarget)) return;
      this.setIsAlternativeDropdownOpen(false);
    },
    setIsAlternativeDropdownOpen(newValue) {
      this.isAlternativeDropdownOpen = newValue;
    },
    selectAlternative(alternative) {
      this.selectedIndicator = alternative;
      this.selectedIndicatorParameters = null;
      this.setIsAlternativeDropdownOpen(false);
    },
    onParameterChange(
      selectedUnit,
      selectedCountry,
      selectedAdmin1,
      selectedAdmin2,
      timeseries,
      aggregatedTimeseriesValue
    ) {
      this.newIndicatorParameters = {
        selectedUnit,
        selectedCountry,
        selectedAdmin1,
        selectedAdmin2,
        timeseries,
        aggregatedTimeseriesValue
      };
    }
  }
};

</script>

<style lang="scss" scoped>
::v-deep(.modal-container) {
  width: 80%;
}

.header {
  overflow: hidden;
  text-overflow: ellipsis;
}

.alternative-dropdown {
  position: absolute;
  top: 100%;
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
}

.search-bar {
  position: relative;
}

.no-results {
  display: block;
  text-align: center;
  color: #888;
  width: 100%;
  margin: 5px 10px;
}

.no-indicator-message {
  margin-left: auto;
  margin-right: auto;
  width: fit-content;
}
</style>
