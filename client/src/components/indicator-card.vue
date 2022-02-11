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
        <p>This will copy the visualization settings from this indicator to all indicators in this dataset.</p>
        <message-display
          :message="'Warning: Any visualization settings in the other indicators will be overwritten.'"
          :message-type="'alert-warning'"
        />
      </template>
    </modal-confirmation>
    <div>
      <b>
        {{datacube.outputs[0].display_name}}
<!--        <span v-if="datacube.status === DatacubeStatus.Deprecated" style="padding: 4px; background-color: lightgray" >Hidden</span>-->
      </b>
    </div>

    <div class="card-body">
      <div class="card-column card-column-wider">
        {{datacube.outputs[0].description}}
      </div>
      <div class="card-column">
        <div class="column-title">Unit</div>
        <b>{{datacube.outputs[0].unit}}</b>
        <br>
        {{datacube.outputs[0].unit_description}}
      </div>
      <div class="card-column" style="display: flex; flex-direction: column">
        <div class="column-title">Data Size</div>
        <div><b>Resolution: </b>{{datacube.outputs[0].data_resolution?.temporal_resolution}}</div>
        <div><b>Raw Points: </b>{{(datacube.data_info?.num_rows_per_feature ?? {})[datacube.default_feature] ?? 'unknown'}}</div>
        <div><b>Months: </b>{{(datacube.data_info?.month_timeseries_size ?? {})[datacube.default_feature] ?? 'unknown'}}</div>
        <div><b>Years: </b>{{(datacube.data_info?.year_timeseries_size ?? {})[datacube.default_feature] ?? 'unknown'}}</div>
      </div>
    </div>

    <div class="button-row">
      <button
        v-tooltip.top-center="'Edit the metadata and visualization'"
        type="button"
        class="btn btn-primary btn-call-for-action"
        :disabled="!allowEditing"
        @click="edit(datacube.id)"
      >
        <i class="fa fa-edit" />
        Edit
      </button>
      <button
        v-tooltip.top-center="'Apply the visualization from this indicator to all others from this dataset'"
        type="button"
        class="btn btn-primary"
        :disabled="!allowEditing"
        @click="showApplyToAllModal = true"
      >
        Apply Settings To All
      </button>
<!--      <button-->
<!--        v-tooltip.top-center="'Hide/Show the indicator'"-->
<!--        type="button"-->
<!--        class="remove-button"-->
<!--        :disabled="!allowEditing"-->
<!--        @click.stop="toggleHiddenState()"-->
<!--      >-->
<!--        <i class="fa" :class="{ 'fa-eye': datacube.status === DatacubeStatus.Deprecated, 'fa-eye-slash': datacube.status !== DatacubeStatus.Deprecated }" />-->
<!--        {{datacube.status === DatacubeStatus.Deprecated ? 'Show' : 'Hide'}}-->
<!--      </button>-->
    </div>
  </div>
</template>

<script lang="ts">

import { defineComponent, ref, PropType } from 'vue';
import { mapGetters } from 'vuex';

import ModalConfirmation from '@/components/modals/modal-confirmation.vue';

import MessageDisplay from './widgets/message-display.vue';
import dateFormatter from '@/formatters/date-formatter';
import { Indicator } from '@/types/Datacube';
import { DatacubeStatus } from '@/types/Enums';

/**
 * A card-styled widget to view project summary
 */
export default defineComponent({
  name: 'IndicatorCard',
  components: {
    ModalConfirmation,
    MessageDisplay
  },
  emits: ['apply-to-all', 'toggle-hidden'],
  props: {
    datacube: {
      type: Object as PropType<Indicator>,
      default: () => ({})
    },
    allowEditing: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapGetters({
      project: 'app/project',
      projectType: 'app/projectType'
    })
  },
  setup() {
    const showApplyToAllModal = ref(false);

    return {
      showApplyToAllModal,
      DatacubeStatus
    };
  },
  methods: {
    dateFormatter,
    edit(id: string) {
      this.$router.push({
        name: 'indicatorPublishingExperiment',
        query: { datacube_id: id },
        params: {
          project: this.project,
          projectType: this.projectType
        }
      });
    },
    applyToAll() {
      this.showApplyToAllModal = false;
      this.$emit('apply-to-all');
    },
    toggleHiddenState() {
      this.$emit('toggle-hidden');
    }
  }
});
</script>

<style scoped lang="scss">
@import "~styles/variables";

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
  margin: 10px 0;
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
  background: #F44336;
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
