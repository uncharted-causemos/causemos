<template>
  <div class="project-card-container">
    <modal-confirmation
      v-if="showModal"
      :autofocus-confirm="false"
      @confirm="unpublish"
      @close="showModal = false"
    >
      <template #title>Unpublish Datacube Instance</template>
      <template #message>
        <p>Are you sure you want to unpublish <strong>{{ datacube.name }}</strong>?</p>
        <message-display
          :message="'Warning: This action cannot be undone.'"
          :message-type="'alert-warning'"
        />
      </template>
    </modal-confirmation>
    <div class="row project-card-header">
      <b>
      {{primaryOutput.display_name}} : <span style="padding: 4px" :style="{ backgroundColor: statusColor }">{{ statusLabel }}</span>
      </b>
    </div>
    <div class="row">
      <div class="col-sm-3 instance-header" style="margin-left: 2rem">
        Inputs
      </div>
      <div class="col-sm-2 instance-header">
        Outputs
      </div>
      <div class="col-sm-2 instance-header">
        Scope
      </div>
      <div class="col-sm-2 instance-header">
        Analyses
      </div>
      <div class="col-sm-2 instance-header">
        Scenarios
      </div>
    </div>
    <div class="row">
      <div class="col-sm-3 fixed-height-column" style="margin-left: 2rem">
        <div
          v-for="input in inputKnobs"
          :key="input.name">
          {{ input.display_name }}
        </div>
      </div>
      <div class="col-sm-2 fixed-height-column">
        <div
          v-for="output in validatedOutputs"
          :key="output.name">
          {{ output.name }}
        </div>
      </div>
      <div class="col-sm-2">
        <!-- placeholder for map or image for regional context -->
        <div style="backgroundColor: darkgray; height: 100px"></div>
      </div>
      <div class="col-sm-2 fixed-height-column">
        <div
          v-for="analysis in ['analysis x', 'analysis y', 'analysis z']"
          :key="analysis">
          {{ analysis }}
        </div>
      </div>
      <div class="col-sm-2" style="display: flex; flex-direction: column">
        <div><b>Scenarios</b></div>
        <div>55</div>
        <div><b>Insights</b></div>
        <div>7</div>
        <div><b>Comments</b></div>
        <div>3</div>
      </div>
    </div>

    <div class="row">
      <div class="col-sm-7"></div>
      <div class="col-sm-3">
        <button
          v-tooltip.top-center="'Open datacube instance for review'"
          type="button"
          class="btn btn-primary button-spacing btn-call-for-action"
          @click="open(datacube.data_id)"
        ><i class="fa fa-folder-open-o" />
          Open</button>
          <button
          v-tooltip.top-center="'Edit datacube instance publication'"
          type="button"
          class="btn btn-primary button-spacing"
          @click="edit(datacube.data_id)"
        ><i class="fa fa-edit" />
          Edit</button>
      </div>
      <div class="col-sm-2">
        <button
          v-tooltip.top-center="'Unpublish the datacube instance'"
          type="button"
          class="remove-button button-spacing"
          :class="{ 'disabled': datacube.status === DatacubeStatus.Registered}"
          :disabled="datacube.status === DatacubeStatus.Registered"
          @click.stop="showWarningModal"
        >
          <i class="fa fa-trash" />
          Unpublish
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import { defineComponent, ref, PropType } from 'vue';
import { mapActions, mapGetters } from 'vuex';

import ModalConfirmation from '@/components/modals/modal-confirmation.vue';

import MessageDisplay from './widgets/message-display.vue';
import dateFormatter from '@/formatters/date-formatter';
import { Datacube, Model } from '@/types/Datacube';
import { DatacubeStatus } from '@/types/Enums';
import { getValidatedOutputs, isIndicator } from '@/utils/datacube-util';

/**
 * A card-styled widget to view project summary
 */
export default defineComponent({
  name: 'DomainDatacubeInstanceCard',
  components: {
    ModalConfirmation,
    MessageDisplay
  },
  props: {
    datacube: {
      type: Object as PropType<Datacube>,
      default: () => ({})
    }
  },
  computed: {
    ...mapGetters({
      project: 'app/project',
      projectMetadata: 'app/projectMetadata'
    }),
    breakdownParameters(): any[] {
      if (isIndicator(this.datacube)) return [];
      return (this.datacube as Model).parameters.filter(p => p.is_drilldown);
    },
    inputKnobs(): any[] {
      if (isIndicator(this.datacube)) return [];
      return (this.datacube as Model).parameters.filter(p => !p.is_drilldown);
    },
    validatedOutputs(): any[] {
      return getValidatedOutputs(this.datacube.outputs);
    },
    primaryOutput(): any {
      return this.validatedOutputs.find(o => o.name === this.datacube.default_feature);
    },
    statusColor(): string {
      let color = '';
      switch (this.datacube.status) {
        case DatacubeStatus.Ready:
          color = 'lightgreen';
          break;
        case DatacubeStatus.Registered:
          color = 'lightgray';
          break;
        default:
          color = 'red';
      }
      return color;
    },
    statusLabel(): string {
      if (this.datacube && this.datacube.status) {
        const label = this.datacube.status === DatacubeStatus.Ready ? 'Published' : this.datacube.status.toLowerCase();
        return label.charAt(0).toUpperCase() + label.slice(1);
      }
      return '';
    }
  },
  setup() {
    const showModal = ref(false);

    return {
      showModal,
      DatacubeStatus
    };
  },
  methods: {
    ...mapActions({
      clearLastQuery: 'query/clearLastQuery',
      updateAnalysisItemsNewPreview: 'dataAnalysis/updateAnalysisItemsNewPreview'
    }),
    dateFormatter,
    unpublish() {
      this.$emit('unpublish', this.datacube);
      this.showModal = false;
    },
    showWarningModal() {
      this.showModal = true;
    },
    closeWarning() {
      this.showModal = false;
    },
    async open(id: string) {
      // Reset filters every time we open
      this.clearLastQuery();
      // redirect
      // open the datacube page similar to the data space
      await this.updateAnalysisItemsNewPreview({ datacubeIDs: [id] });
      this.$router.push({
        name: 'dataPreview',
        params: {
          project: this.project,
          projectType: this.projectMetadata.type
        }
      });
    },
    edit(id: string) {
      // Reset filters every time we edit
      this.clearLastQuery();
      // redirect
      this.$router.push({
        name: 'modelPublishingExperiment',
        query: { datacubeid: id },
        params: {
          project: this.project,
          projectType: this.projectMetadata.type
        }
      });
    }
  }
});
</script>

<style scoped lang="scss">
@import "~styles/variables";

.instance-header {
  @include header-secondary;
  font-weight: bold;
  color: darkgrey;
  padding-bottom: 5px;
}

.fixed-height-column {
  height: 12vh;
  overflow: auto;
}

.project-card-container {
  background: #fcfcfc;
  border: 1px solid #dedede;
  margin: 1px 0;
  padding: 6px;
}

.project-card-container:hover {
  border-color: $selected;
}

.selected {
  border-left: 4px solid $selected;
  background-color: #ffffff;
}

.project-card-header {
  padding-bottom: 5px;
  padding-top: 5px;
  padding-left: 3rem;
}

.button-spacing {
  padding: 4px;
  margin: 2px;
  border-radius: 8px;
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
