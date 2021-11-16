<template>
  <div class="project-card-container">
    <modal-confirmation
      v-if="showUnpublishModal"
      :autofocus-confirm="false"
      @confirm="unpublish"
      @close="showUnpublishModal = false"
    >
      <template #title>Unpublish Datacube Instance</template>
      <template #message>
        <p>Are you sure you want to unpublish<strong>{{ datacube.name }}</strong>?</p>
        <message-display
          :message="'Warning: This action cannot be undone.'"
          :message-type="'alert-warning'"
        />
      </template>
    </modal-confirmation>
    <modal-confirmation
      v-if="showEditInDojoModal"
      :autofocus-confirm="false"
      @confirm="requestEditInDojo"
      @close="showEditInDojoModal = false"
    >
      <template #title>Update Datacube Instance in DOJO</template>
      <template #message>
        <p>Are you sure you want to update the <strong>{{ datacube.name }}</strong> model instance? This will deprecate the current model instance and create a new version.</p>
      </template>
    </modal-confirmation>
    <div>
      <b>
      {{datacube.name}}: <span style="padding: 4px" :style="{ backgroundColor: statusColor }">{{ statusLabel }}</span>
      </b>
    </div>

    <div class="card-body">
      <div class="card-column card-column-wider">
        <div class="column-title">Inputs</div>
        <div
          v-for="input in inputKnobs"
          :key="input.name">
          {{ input.display_name }}
        </div>
      </div>
      <div class="card-column">
        <div class="column-title">Outputs</div>
        <div
          v-for="output in validatedOutputs"
          :key="output.name">
          {{ output.name }}
        </div>
      </div>
      <div class="card-column">
        <div class="column-title">Scope</div>
        <!-- placeholder for map or image for regional context -->
        <div style="backgroundColor: #ddd; height: 100px"></div>
      </div>
      <div class="card-column">
        <div class="column-title">Analyses</div>
        <div
          v-for="analysis in ['analysis x', 'analysis y', 'analysis z']"
          :key="analysis">
          {{ analysis }}
        </div>
      </div>
      <div class="card-column" style="display: flex; flex-direction: column">
        <div class="column-title">Scenarios</div>
        <div><b>Scenarios</b></div>
        <div>55</div>
        <div><b>Insights</b></div>
        <div>7</div>
        <div><b>Comments</b></div>
        <div>3</div>
      </div>
    </div>

    <div class="button-row">
      <!--
      <button
        v-tooltip.top-center="'Open datacube instance for review'"
        type="button"
        class="btn btn-primary button-spacing btn-call-for-action"
        @click="open(datacube.data_id)"
      ><i class="fa fa-folder-open-o" />
        Open
      </button>
      -->
      <button
        v-tooltip.top-center="'Update the model instance in Dojo'"
        type="button"
        class="btn btn-primary"
        @click="showEditInDojoModal=true"
      >
        Update in DOJO
      </button>
      <button
        v-tooltip.top-center="'Edit the metadata and visualization'"
        type="button"
        class="btn btn-primary btn-call-for-action"
        @click="edit(datacube.data_id)"
      >
        <i class="fa fa-edit" />
        Edit
      </button>
      <button
        v-tooltip.top-center="'Unpublish the datacube instance'"
        type="button"
        class="remove-button"
        :class="{ 'disabled': datacube.status === DatacubeStatus.Registered}"
        :disabled="datacube.status === DatacubeStatus.Registered"
        @click.stop="showUnpublishModal = true"
      >
        <i class="fa fa-trash" />
        Unpublish
      </button>
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
  emits: ['unpublish'],
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
    const showUnpublishModal = ref(false);
    const showEditInDojoModal = ref(false);

    return {
      showUnpublishModal,
      showEditInDojoModal,
      DatacubeStatus
    };
  },
  methods: {
    ...mapActions({
      clearLastQuery: 'query/clearLastQuery',
      updateAnalysisItemsPreview: 'dataAnalysis/updateAnalysisItemsPreview'
    }),
    dateFormatter,
    unpublish() {
      this.$emit('unpublish', this.datacube);
      this.showUnpublishModal = false;
    },
    requestEditInDojo() {
      this.showEditInDojoModal = false;
      // redirect to DOJO to update the datacube
      const BASE_DOJO_URL = 'https://phantom.dojo-test.com/summary?model=';
      const redirectURL = BASE_DOJO_URL + this.datacube.data_id;
      window.location.href = redirectURL;
    },
    async open(id: string) {
      // Reset filters every time we open
      this.clearLastQuery();
      // redirect
      // open the datacube page similar to the data space
      await this.updateAnalysisItemsPreview({ datacubeIDs: [id] });
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
        query: { datacube_id: id },
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

.project-card-container {
  background: white;
  margin-top: 5px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  height: 250px;
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
