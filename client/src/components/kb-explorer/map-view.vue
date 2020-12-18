<template>
  <map-points
    :map-data="mapData"
    :layer-id="layerId"
    :layer-source-id="layerSourceId"
    :formatter-fn="popupValueFormatter"
    :show-tooltip="true"
    @select-location="handleSelectedLocation"
  />

</template>

<script>

import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';

import filtersUtil from '@/utils/filters-util';
import MapPoints from '@/components/kb-explorer/map-points';

export default {
  name: 'MapView',
  components: {
    MapPoints
  },
  props: {
    mapData: {
      type: Object,
      default: () => null
    }
  },
  computed: {
    ...mapGetters({
      filters: 'query/filters'
    })
  },
  created() {
    this.layerId = 'point-layer';
    this.layerSourceId = 'point-data';
  },
  methods: {
    ...mapActions({
      setSearchClause: 'query/setSearchClause'
    }),
    popupValueFormatter(feature) {
      const value = _.isNil(feature) ? 0 : feature.properties.count;
      return `Name: ${feature.properties.name} <br> Occurrences: ${value}`;
    },
    handleSelectedLocation(selections) {
      const geoLocationFacet = filtersUtil.findPositiveFacetClause(this.filters, 'factorLocationName');
      const clearSelection = _.isEmpty(selections);
      if (clearSelection && geoLocationFacet) {
        this.setSearchClause({ field: 'factorLocationName', values: [] });
      } else if (!clearSelection) {
        let values = [];
        if (geoLocationFacet) {
          values = _.clone(geoLocationFacet.values);
        }

        // Single value is toggle, everything else is additive
        if (selections.length === 1 && values.includes(selections[0])) {
          _.remove(values, d => d === selections[0]);
        } else {
          values = _.uniq(values.concat(selections));
        }
        this.setSearchClause({ field: 'factorLocationName', values: values });
      }
    }
  }
};
</script>
