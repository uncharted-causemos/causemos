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
        <p>
          Are you sure you want to unpublish<strong>{{ datacube.name }}</strong
          >?
        </p>
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
        <p>
          Are you sure you want to update the <strong>{{ datacube.name }}</strong> model instance?
          This will deprecate the current model instance and create a new version.
        </p>
      </template>
    </modal-confirmation>
    <div>
      <b>
        {{ datacube.name }}:
        <span style="padding: 4px" :style="{ backgroundColor: statusColor }">{{
          statusLabel
        }}</span>
        <span
          v-if="newVersionLink"
          @click="() => edit(newVersionLink as string)"
          rel="noopener noreferrer"
          class="deprecated-datacube"
        >
          Link to new version
        </span>
      </b>
    </div>

    <div class="card-body">
      <div class="card-column">
        <div class="column-title">Inputs</div>
        <div v-for="input in inputKnobs" :key="input.name">
          {{ input.display_name }}
        </div>
      </div>
      <div class="card-column">
        <div class="column-title">Outputs</div>
        <div v-for="output in validatedOutputs" :key="output.name">
          {{ output.display_name || output.name }}
        </div>
      </div>
      <div class="card-column">
        <div class="column-title">Qualifiers</div>
        <div v-for="qualifier in displayedQualifiers" :key="qualifier.name">
          {{ qualifier.display_name || qualifier.name }}
        </div>
      </div>
      <div class="card-column">
        <div class="column-title">Domains</div>
        <div style="display: flex; align-items: center; flex-wrap: wrap">
          <select
            name="domains"
            style="margin-right: 7px"
            id="domains"
            @change="event => selectedDomain = AVAILABLE_DOMAINS[(event.target as HTMLSelectElement).selectedIndex - 1]"
          >
            <option disabled selected value="''">Select a domain</option>
            <option v-for="domain in AVAILABLE_DOMAINS" :key="domain">
              {{ domain }}
            </option>
          </select>
          <button
            type="button"
            class="btn"
            style="padding: 2px 4px"
            @click="addDomain"
            :disabled="selectedDomain === ''"
          >
            Add
          </button>
        </div>
        <div v-if="datacubeDomains" style="display: flex; flex-wrap: wrap">
          <div v-for="domain in datacubeDomains" :key="domain">
            <span style="margin: 2px; background-color: white"
              >{{ domain }} <i @click="removeDomain(domain)" class="fa fa-remove"
            /></span>
          </div>
        </div>
      </div>
      <div class="card-column card-column-thin">
        <div class="column-title">Preview</div>
        <div class="timeseries-container">
          <sparkline :data="timeseries" />
        </div>
      </div>
    </div>

    <div class="button-row">
      <button
        v-tooltip.top-center="'Update the model instance in Dojo'"
        type="button"
        class="btn btn-primary"
        @click="showEditInDojoModal = true"
      >
        Update model
      </button>
      <button
        v-tooltip.top-center="'Edit the metadata and visualization'"
        type="button"
        class="btn btn-call-to-action"
        @click="edit(datacube.data_id)"
      >
        <i v-if="datacube.status !== DatacubeStatus.Deprecated" class="fa fa-edit" />
        {{ datacube.status === DatacubeStatus.Deprecated ? 'View' : 'Edit' }}
      </button>
      <button
        v-if="datacube.status !== DatacubeStatus.Deprecated"
        v-tooltip.top-center="'Unpublish the datacube instance'"
        type="button"
        class="remove-button"
        :class="{
          disabled: datacube.status === DatacubeStatus.Registered,
        }"
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
import _ from 'lodash';
import { defineComponent, ref, PropType, toRefs } from 'vue';
import { mapActions, mapGetters } from 'vuex';

import ModalConfirmation from '@/components/modals/modal-confirmation.vue';
import Sparkline from '@/components/widgets/charts/sparkline.vue';
import MessageDisplay from './widgets/message-display.vue';
import dateFormatter from '@/formatters/date-formatter';
import { FeatureQualifier, Indicator, Model } from '@/types/Datacube';
import { DatacubeStatus } from '@/types/Enums';
import { AVAILABLE_DOMAINS, getValidatedOutputs, isIndicator } from '@/utils/datacube-util';
import useDatacubeVersioning from '@/composables/useDatacubeVersioning';
import { isBreakdownQualifier } from '@/utils/qualifier-util';
import { updateDatacube } from '@/services/new-datacube-service';
import useToaster from '@/composables/useToaster';
import { TYPE } from 'vue-toastification';
import useApplicationConfiguration from '@/composables/useApplicationConfiguration';
/**
 * A card-styled widget to view project summary
 */
export default defineComponent({
  name: 'DomainDatacubeInstanceCard',
  components: {
    ModalConfirmation,
    Sparkline,
    MessageDisplay,
  },
  emits: ['unpublish', 'update-domains'],
  props: {
    datacube: {
      type: Object as PropType<Model | Indicator>,
      default: () => ({}),
    },
  },
  computed: {
    ...mapGetters({
      project: 'app/project',
      projectMetadata: 'app/projectMetadata',
    }),
    breakdownParameters(): any[] {
      if (isIndicator(this.datacube)) return [];
      return (this.datacube as Model).parameters.filter((p) => p.is_drilldown);
    },
    inputKnobs(): any[] {
      if (isIndicator(this.datacube)) return [];
      return (this.datacube as Model).parameters.filter((p) => !p.is_drilldown);
    },
    validatedOutputs(): any[] {
      return getValidatedOutputs(this.datacube.outputs);
    },
    displayedQualifiers(): FeatureQualifier[] {
      return (
        this.datacube?.qualifier_outputs?.filter((q: FeatureQualifier) =>
          isBreakdownQualifier(q)
        ) ?? []
      );
    },
    newVersionLink(): string | null {
      if (
        this.datacube.status === DatacubeStatus.Deprecated &&
        this.datacube.new_version_data_id !== undefined
      ) {
        return this.datacube.new_version_data_id;
      }
      return null;
    },
    timeseries(): any {
      return this.datacube?.sparkline
        ? [
            {
              name: 'datacube',
              color: '',
              series: this.datacube.sparkline,
            },
          ]
        : [];
    },
    datacubeDomains(): any {
      return this.datacube?.domains ?? [];
    },
  },
  setup(props) {
    const { datacube } = toRefs(props);

    const showUnpublishModal = ref(false);
    const showEditInDojoModal = ref(false);
    const selectedDomain = ref('');

    const { statusColor, statusLabel } = useDatacubeVersioning(datacube);
    const { applicationConfiguration } = useApplicationConfiguration();

    return {
      showUnpublishModal,
      showEditInDojoModal,
      DatacubeStatus,
      statusColor,
      statusLabel,
      selectedDomain,
      AVAILABLE_DOMAINS,
      applicationConfiguration,
    };
  },
  methods: {
    ...mapActions({
      clearLastQuery: 'query/clearLastQuery',
    }),
    dateFormatter,
    addDomain() {
      const newDomains = this.datacubeDomains ? _.cloneDeep(this.datacubeDomains) : [];
      if (this.selectedDomain !== '' && !newDomains.includes(this.selectedDomain)) {
        newDomains.push(this.selectedDomain);
        this.saveDomains(newDomains);
      }
    },
    removeDomain(domain: string) {
      const newDomains = this.datacubeDomains.filter((d: any) => d !== domain);
      this.saveDomains(newDomains);
    },
    async saveDomains(newDomains: string[]) {
      const delta = {
        id: this.datacube?.id,
        domains: newDomains,
      };
      try {
        await updateDatacube(delta.id, delta);
        this.$emit('update-domains', delta.id, delta.domains);
      } catch {
        useToaster()('Saving Domains failed', TYPE.INFO);
      }
    },
    unpublish() {
      this.$emit('unpublish', this.datacube);
      this.showUnpublishModal = false;
    },
    requestEditInDojo() {
      this.showEditInDojoModal = false;
      // redirect to DOJO to update the datacube
      const BASE_DOJO_URL =
        this.applicationConfiguration.CLIENT__DOJO_LOG_API_URL + '/summary?model=';
      const redirectURL = BASE_DOJO_URL + this.datacube.data_id;
      window.location.href = redirectURL;
    },
    edit(id: string) {
      // Reset filters every time we edit
      this.clearLastQuery();
      // redirect
      this.$router.push({
        name: 'modelPublisher',
        query: { datacube_id: id },
        params: {
          project: this.project,
          projectType: this.projectMetadata.type,
        },
      });
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

.card-column-thin {
  flex: 1;
}

.button-row {
  display: flex;
  justify-content: flex-end;

  button:not(:first-child) {
    margin-left: 5px;
  }
}

.timeseries-container {
  background-color: #f1f1f1;
  width: 110px;
  height: 50px;
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
