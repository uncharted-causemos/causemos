<template>
  <div class="indicator-card-container">
    <modal-confirmation
      v-if="showApplyToAllModal"
      :autofocus-confirm="false"
      @confirm="applyToAll"
      @close="showApplyToAllModal = false"
    >
      <template #title>Apply Settings To All</template>
      <template #message>
        <p>
          This will copy the visualization settings from this indicator to all indicators in this
          dataset.
        </p>
        <message-display
          :message="'Warning: Any visualization settings in the other indicators will be overwritten.'"
          :message-type="'alert-warning'"
        />
      </template>
    </modal-confirmation>
    <div v-if="!isEditingMeta" style="margin-bottom: 10px">
      <b>{{ datacube.outputs[0].display_name }}</b>
    </div>
    <div v-else>
      <textarea
        v-model="editedMeta.display_name"
        type="text"
        wrap="off"
        rows="1"
        style="font-weight: bold; width: 75%; overflow-x: hidden"
      />
    </div>
    <div class="card-body">
      <div
        v-if="!isEditingMeta"
        class="card-column card-column-wider"
        style="display: flex; flex-direction: column; justify-content: space-between"
      >
        <multiline-description :text="datacube.outputs[0].description" />
        <div>
          <b>{{ datacube.outputs[0].unit }}</b> {{ datacube.outputs[0].unit_description }}
        </div>
      </div>
      <div v-else class="card-column card-column-wider" style="overflow: visible">
        <textarea
          v-model="editedMeta.description"
          type="text"
          rows="4"
          style="width: 100%; padding: 0"
        />
        <div style="display: flex">
          <textarea
            v-model="editedMeta.unit"
            type="text"
            wrap="off"
            rows="1"
            style="font-weight: bold; width: 40%; overflow-x: hidden"
          />
          <textarea v-model="editedMeta.unit_description" type="text" rows="1" style="width: 60%" />
        </div>
      </div>
      <div class="card-column card-column-wider" style="display: flex; flex-direction: column">
        <div class="column-title">Qualifiers</div>
        <div style="display: flex; flex-direction: column; overflow-y: auto">
          <div v-for="qualifier in visibleQualifiers" :key="qualifier.name">
            <b>{{ qualifier.display_name }}</b> {{ qualifier.description }}
          </div>
        </div>
      </div>
      <div class="card-column" style="display: flex; flex-direction: column">
        <div class="column-title">Data Info</div>
        <div>
          <b>Raw Resolution: </b>{{ datacube.outputs[0].data_resolution?.temporal_resolution }}
        </div>
        <div v-if="datacube.data_info?.num_rows_per_feature">
          <b>Raw Points: </b
          >{{
            (datacube.data_info?.num_rows_per_feature ?? {})[datacube.default_feature] ?? 'unknown'
          }}
        </div>
        <div><b>Aggregated by: </b>{{ aggregationFunctions }}</div>
        <div>
          <b>Months: </b
          >{{
            (datacube.data_info?.month_timeseries_size ?? {})[datacube.default_feature] ?? 'unknown'
          }}
          | <b> Years: </b
          >{{
            (datacube.data_info?.year_timeseries_size ?? {})[datacube.default_feature] ?? 'unknown'
          }}
        </div>
      </div>
    </div>

    <div class="button-row" v-if="!isEditingMeta">
      <button
        v-tooltip.top-center="'Edit the metadata'"
        type="button"
        class="btn btn-primary"
        :disabled="!allowEditing"
        @click="startEditingMeta"
      >
        <i class="fa fa-edit" />
        Edit
      </button>
      <button
        v-tooltip.top-center="'Set visualization options'"
        type="button"
        class="btn btn-call-to-action"
        :disabled="!allowEditing"
        @click="edit(datacube.id)"
      >
        <i class="fa fa-chart-line" />
        Edit visualization
      </button>
    </div>
    <div v-else class="button-row editing-meta">
      <button
        v-tooltip.top-center="'Save changes'"
        type="button"
        class="btn btn-call-to-action"
        @click="saveMetaChanges"
      >
        Save
      </button>
      <button
        v-tooltip.top-center="'Discard changes'"
        type="button"
        class="btn btn-primary"
        @click="isEditingMeta = false"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, PropType, Ref } from 'vue';
import { mapGetters } from 'vuex';

import ModalConfirmation from '@/components/modals/modal-confirmation.vue';
import MultilineDescription from '@/components/widgets/multiline-description.vue';
import MessageDisplay from './widgets/message-display.vue';
import dateFormatter from '@/formatters/date-formatter';
import { DatacubeFeature, FeatureQualifier, Indicator } from '@/types/Datacube';
import { DatacubeStatus } from '@/types/Enums';
import _ from 'lodash';
import { isBreakdownQualifier } from '@/utils/qualifier-util';

/**
 * A card-styled widget to view project summary
 */
export default defineComponent({
  name: 'IndicatorCard',
  components: {
    ModalConfirmation,
    MessageDisplay,
    MultilineDescription,
  },
  emits: ['apply-to-all', 'toggle-hidden', 'update-meta'],
  props: {
    datacube: {
      type: Object as PropType<Indicator>,
      default: () => ({}),
    },
    allowEditing: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    ...mapGetters({
      project: 'app/project',
      projectType: 'app/projectType',
    }),
    visibleQualifiers(): FeatureQualifier[] {
      return this.datacube?.qualifier_outputs?.filter((q) => isBreakdownQualifier(q)) ?? [];
    },
    aggregationFunctions(): string {
      const selections = this.datacube?.default_view;
      return `${selections?.temporalAggregation ?? 'mean'}/${
        selections?.spatialAggregation ?? 'mean (default)'
      }`;
    },
  },
  setup() {
    const showApplyToAllModal = ref(false);
    const isEditingMeta = ref(false);
    const editedMeta = ref({}) as Ref<DatacubeFeature>;

    return {
      showApplyToAllModal,
      isEditingMeta,
      editedMeta,
      DatacubeStatus,
    };
  },
  methods: {
    dateFormatter,
    edit(id: string) {
      this.$router.push({
        name: 'indicatorPublisher',
        query: { datacube_id: id },
        params: {
          project: this.project,
          projectType: this.projectType,
        },
      });
    },
    applyToAll() {
      this.showApplyToAllModal = false;
      this.$emit('apply-to-all');
    },
    toggleHiddenState() {
      this.$emit('toggle-hidden');
    },
    startEditingMeta() {
      const outputs = this.datacube?.outputs;
      if (outputs && outputs.length === 1) {
        this.isEditingMeta = true;
        this.editedMeta = _.cloneDeep(outputs[0]);
      }
    },
    saveMetaChanges() {
      this.$emit('update-meta', { id: this.datacube?.id, meta: this.editedMeta });
      this.isEditingMeta = false;
    },
  },
});
</script>

<style scoped lang="scss">
@import '~styles/variables';

.deprecated-datacube {
  color: blue;
  padding-left: 4px;
  &:hover {
    cursor: pointer;
    text-decoration: underline;
  }
}

.indicator-card-container {
  background: white;
  margin-top: 5px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  height: 200px;
}

.column-title {
  @include header-secondary;
  font-weight: bold;
  color: darkgrey;
  padding-bottom: 5px;
}

.card-body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.card-column {
  flex: 2;
  overflow: hidden;

  div {
    text-overflow: ellipsis;
  }

  &:not(:first-child) {
    margin-left: 5px;
  }
}

.card-column-wider {
  flex: 3;
}

.button-row {
  display: flex;
  justify-content: flex-end;

  button:not(:first-child) {
    margin-left: 5px;
  }
}

.selected {
  border-left: 4px solid $selected;
  background-color: #ffffff;
}

.remove-button {
  background: #f44336;
  color: white;
  font-weight: 600;
  border: none;
  user-select: none;

  &.disabled {
    opacity: 0.65;
    cursor: not-allowed;
    pointer-events: all;

    button {
      opacity: 1;
    }

    &::before {
      cursor: not-allowed;
    }
  }
}
</style>
