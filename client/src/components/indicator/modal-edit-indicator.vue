<template>
  <modal
    class="modal-edit-indicator-container"
    :show-close-button="true"
    @close="close"
  >
    <h4
      slot="header"
      class="header"
    >
      <!-- FIXME: our version of Font-Awesome doesn't include this icon -->
      <i class="fa fa-fw fa-chart-line" />
      Quantify Concept{{ headerSuffix }}
    </h4>
    <template slot="body">
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
          <div slot="content">
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
          </div>
        </dropdown-control>
      </div>
      <indicator-editor
        v-if="selectedIndicator !== null && selectedIndicatorData !== null"
        :indicator="selectedIndicator"
        :indicator-parameters="selectedIndicatorParameters"
        :all-regional-data="selectedIndicatorData"
        :model-summary="modelSummary"
        @parameter-change="onParameterChange"
      />
      <message-display
        v-else
        class="no-indicator-message"
        :message="messageNoIndicator"
      />
    </template>
    <div slot="footer">
      <div
        class="btn btn-primary btn-call-for-action"
        @click="save"
      >
        Save
      </div>
    </div>
  </modal>
</template>

<script>
import _ from 'lodash';
import API from '@/api/api';

import IndicatorEditor from '@/components/indicator/indicator-editor';
import Modal from '@/components/modals/modal';
import DropdownControl from '@/components/dropdown-control';
import MessageDisplay from '@/components/widgets/message-display';
import filtersUtil from '@/utils/filters-util';
import IndicatorSearchResult from '@/components/indicator/indicator-search-result';
import IndicatorSearchHeader from '@/components/indicator/indicator-search-header';
import aggregationsUtil from '@/utils/aggregations-util';
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
  data: () => ({
    // Contains metadata for the currently selected indicator
    selectedIndicator: null,
    // Contains the selected region at each admin level, selected unit, and function
    selectedIndicatorParameters: null,
    // A much larger data structure that contains timeseries for all
    //  regions at all admin levels that are supported by the currently
    //  selected indicator
    selectedIndicatorData: null,
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
    }
  },
  watch: {
    selectedIndicator(n, o) {
      if (_.isNil(n) || _.isEqual(n, o)) return;
      this.fetchIndicatorData();
    },
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
      this.$emit('save', this.newIndicatorParameters);
      this.close();
    },
    async fetchIndicatorData() {
      if (this.hasNoIndicator) return;
      this.selectedIndicatorData = null;

      const indicatorUnit = this.selectedIndicator.output_units;
      const url = 'maas/indicator-data' +
        `?indicator=${encodeURI(this.selectedIndicator.variable)}` +
        `&model=${encodeURI(this.selectedIndicator.model)}` +
        (indicatorUnit ? `&unit=${encodeURI(indicatorUnit)}` : '');

      const result = await API.get(url);
      if (result.status !== 200) {
        console.error(`Failed to fetch data points for indicator "${this.selectedIndicator.variable}"`);
        return;
      }

      const pipeline = [
        {
          keyFn: (d) => d.country,
          metaFn: (c) => {
            return { timeseries: _.sortBy(c.dataArray, 'timestamp') };
          }
        },
        {
          keyFn: (d) => d.admin1,
          metaFn: (c) => {
            return { timeseries: _.sortBy(c.dataArray, 'timestamp') };
          }
        },
        {
          keyFn: (d) => d.admin2,
          metaFn: (c) => {
            return { timeseries: _.sortBy(c.dataArray, 'timestamp') };
          }
        }
      ];

      const groupedResult = {};
      if (!_.isNil(indicatorUnit)) {
        groupedResult[indicatorUnit] = aggregationsUtil.groupDataArray(result.data, pipeline);
      } else {
        const byUnit = _.groupBy(result.data, d => d.value_unit);
        Object.keys(byUnit).forEach(unitKey => {
          groupedResult[unitKey] = aggregationsUtil.groupDataArray(byUnit[unitKey], pipeline);
        });
      }

      this.selectedIndicatorData = groupedResult;
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
      const result = await API.get(`maas/datacubes?filters=${encodeURI(JSON.stringify(filters))}`);
      if (result.status !== 200) {
        console.error('Failed to fetch initial metadata');
        return;
      }

      let indicators = result.data || [];
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
      const result = await API.get(`maas/datacubes?filters=${encodeURI(JSON.stringify(filters))}`);
      if (result.status !== 200) {
        console.error('Failed to fetch indicator suggestions');
        return;
      }
      this.indicatorAlternatives = !_.isEmpty(result.data) ? result.data : [];
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
      const result = await API.get(`maas/datacubes?filters=${encodeURI(JSON.stringify(filters))}`);
      if (result.status !== 200) {
        console.error('Failed to search for indicator suggestions');
        return;
      }
      this.indicatorAlternatives = result.data;
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
    onParameterChange(newIndicatorState) {
      this.newIndicatorParameters = newIndicatorState;
    }
  }
};

</script>

<style lang="scss" scoped>
/deep/ .modal-container {
  width: 80%;
}

/deep/ .modal-body {
  padding: 20px;
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
