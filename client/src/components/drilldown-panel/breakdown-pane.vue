<template>
  <div class="breakdown-pane-container">
    <!-- TODO: eventually we'll add support for multiple
      selected scenario IDs -->
    <aggregation-checklist-pane
      v-if="regionalData.length !== 0"
      class="checklist-section"
      :aggregation-level-count="availableAdminLevelTitles.length"
      :aggregation-level="selectedAdminLevel"
      :aggregation-level-title="availableAdminLevelTitles[selectedAdminLevel]"
      :raw-data="regionalData[0].data"
      :units="'tonnes'"
      @aggregation-level-change="setSelectedAdminLevel"
    >
      <template #aggregation-description>
        <p class="aggregation-description">
          Showing data for
          <span class="highlighted">{{
            timestampFormatter(selectedTimestamp)
          }}</span
          >.
        </p>
        <p class="aggregation-description">
          Aggregated by <strong>sum</strong>.
        </p>
      </template>
    </aggregation-checklist-pane>
    <!-- TODO: dropdown to select what we're breaking down by -->
    <!-- TODO: Fetch units from model metadata `outputs` property -->
    <aggregation-checklist-pane
      class="checklist-section"
      v-for="type in typeBreakdownData"
      :key="type.name"
      :aggregation-level-count="1"
      :aggregation-level="1"
      :aggregation-level-title="type.name"
      :raw-data="type.data"
      :units="'tonnes'"
    >
      <template #aggregation-description>
        <!-- TODO: highlighted value should be dynamically populated based
        on the selected timestamp -->
        <p class="aggregation-description">
          Showing <strong>placeholder</strong> data.
        </p>
        <p class="aggregation-description">
          Aggregated by <strong>averaging</strong>.
        </p>
      </template>
    </aggregation-checklist-pane>
    <!-- <aggregation-checklist-pane
      :aggregation-level-count="aggregationLevels.length"
      :aggregation-level="selectedAdminLevel"
      :aggregation-level-title="'year'"
      :raw-data="adminLevelData"
      @aggregation-level-change="setSelectedAdminLevel"
    >
      <template #subtitle>
        <span>Showing data across <strong>all time</strong>.</span>
      </template>
    </aggregation-checklist-pane> -->
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, defineComponent, PropType, ref, watch } from 'vue';
import aggregationChecklistPane from '@/components/drilldown-panel/aggregation-checklist-pane.vue';
import dateFormatter from '@/formatters/date-formatter';
import API from '@/api/api';
import { RegionalData } from '@/types/Datacubes';
import { LegacyBreakdownDataStructure, LegacyBreakdownNode } from '@/types/Common';


function timestampFormatter(timestamp: number) {
  // FIXME: we need to decide whether we want our timestamps to be stored in millis or seconds
  //  and be consistent.
  return dateFormatter(timestamp * 1000, 'MMM DD, YYYY');
}

const ADMIN_LEVEL_TITLES = {
  country: 'Country',
  admin1: 'L1 admin region',
  admin2: 'L2 admin region',
  admin3: 'L3 admin region',
  admin4: 'L4 admin region',
  admin5: 'L5 admin region'
};

// Ordered list of the admin region levels
const levels: (keyof typeof ADMIN_LEVEL_TITLES)[] = [
  'country',
  'admin1',
  'admin2',
  'admin3',
  'admin4',
  'admin5'
];

function convertToLegacyAdminDataStructure(
  flattened: RegionalData
): LegacyBreakdownDataStructure {
  const maxDepth = Object.keys(flattened).length;
  const result: LegacyBreakdownNode[] = [];
  levels.forEach(level => {
    if (flattened[level] === undefined) return;
    const distinctRegions = _.groupBy(
      Object.values(flattened[level] as any).flat(),
      (timestamp: { id: string }) => timestamp.id
    );
    Object.keys(distinctRegions).map(regionName => {
      const aggregatedValue = _.sumBy(
        distinctRegions[regionName],
        (entry: any) => entry.value
      );
      let heritage = regionName.split('_');
      let pointer = result;
      // Find where in the tree this region should be inserted
      while (heritage.length > 1) {
        const nextNode = pointer.find(node => node.name === heritage[0]);
        if (nextNode === undefined) return;
        pointer = nextNode?.children;
        heritage = heritage.splice(1);
      }
      const newNode: LegacyBreakdownNode = {
        name: heritage[0],
        value: aggregatedValue,
        children: []
      };
      pointer.push(newNode);
    });
  });
  return {
    maxDepth,
    data: result[0]
  };
}

export default defineComponent({
  components: { aggregationChecklistPane },
  name: 'BreakdownPane',
  props: {
    selectedAdminLevel: {
      type: Number,
      required: true
    },
    selectedModelId: {
      type: String,
      default: null
    },
    selectedScenarioIds: {
      type: Array as PropType<string[]>,
      default: null
    },
    typeBreakdownData: {
      type: Array,
      default: () => []
    },
    selectedTimestamp: {
      type: Number,
      default: 0
    }
  },
  emits: ['set-selected-admin-level'],
  setup(props, { emit }) {
    function setSelectedAdminLevel(level: number) {
      emit('set-selected-admin-level', level);
    }

    // Fetch regional-data for selected model and scenarios
    // FIXME: this code contains a race condition if the selected model or
    //  scenario IDs were to change quickly and the promise sets completed
    //  out of order.
    const rawRegionalData = ref<RegionalData[]>([]);
    async function fetchRegionalData() {
      rawRegionalData.value = [];
      if (
        props.selectedModelId === null ||
        props.selectedScenarioIds.length === 0
      ) {
        return;
      }
      const promises = props.selectedScenarioIds.map(scenarioId =>
        API.get('fetch-demo-data', {
          params: {
            modelId: props.selectedModelId,
            runId: scenarioId,
            type: 'regional-data'
          }
        })
      );
      rawRegionalData.value = (await Promise.all(promises)).map(response =>
        JSON.parse(response.data)
      );
    }

    const regionalData = computed(() => {
      if (rawRegionalData.value.length === 0) return [];
      const filteredByTimestamp = rawRegionalData.value.map(
        dataForOneScenario => {
          const result: RegionalData = {};
          levels.forEach(level => {
            const dataForLevel = dataForOneScenario[level];
            if (dataForLevel === undefined) return;
            const dataForTimestamp =
              dataForLevel[props.selectedTimestamp.toString()] ?? [];
            result[level] = {
              [props.selectedTimestamp.toString()]: dataForTimestamp
            };
          });
          return result;
        }
      );
      return filteredByTimestamp.map(convertToLegacyAdminDataStructure);
    });

    // availableAdminLevels is an array of strings, each of which
    //  must be a key in the ADMIN_LEVEL_TITLES map
    const availableAdminLevelTitles = computed(() => {
      if (regionalData.value.length === 0) return [];
      return levels
        .slice(0, regionalData.value[0].maxDepth)
        .map(adminLevel => ADMIN_LEVEL_TITLES[adminLevel]);
    });

    watch(
      () => [props.selectedModelId, props.selectedScenarioIds],
      fetchRegionalData,
      { immediate: true }
    );
    return {
      setSelectedAdminLevel,
      availableAdminLevelTitles,
      regionalData,
      timestampFormatter
    };
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/_variables';

.aggregation-description {
  color: $text-color-medium;
  margin: 0;
  text-align: right;
}

.highlighted {
  color: $selected-dark;
}

.checklist-section {
  margin-top: 30px;
}
</style>
