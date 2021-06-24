<template>
  <div :class="{ 'project-card-container': !showMore, 'project-card-container selected': showMore }">
    <modal-confirmation
      v-if="showModal"
      :autofocus-confirm="false"
      @confirm="remove"
      @close="showModal = false"
    >
      <template #title>Unpublish Model Instance</template>
      <template #message>
        <p>Are you sure you want to unpublish <strong>{{ model.name }}</strong>?</p>
        <message-display
          :message="'Warning: This action cannot be undone.'"
          :message-type="'alert-warning'"
        />
      </template>
    </modal-confirmation>
    <div
      class="row project-card-header"
      @click="toggleShowMore()">
      <div class="col-sm-4">
        <i
          :class="{ 'fa fa-angle-right': !showMore, 'fa fa-angle-down': showMore }"
        />
        <button
          type="button"
          class="btn btn-link"
          @click="edit(model.id)">
          <span class="overflow-ellipsis project-name">{{model.name}}</span>
        </button>
      </div>
      <div class="col-sm-4">
        {{ model.maintainer.organization }}
      </div>
      <div class="col-sm-2"
        :style="{ color: statusColor }">
        {{ statusLabel }}
      </div>
      <div class="col-sm-2">
        {{ dateFormatter(model.created_at) }}
      </div>
    </div>
    <div
      v-if="showMore"
      class="container-fluid project-card-content"
      @click="toggleShowMore()">
      <div class="row">
        <div class="col-sm-12 details">
          <div>
            <p><b>{{model.description}}</b></p>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="showMore"
      class="project-card-footer"
    >
      <div class="row">
        <div class="col-sm-10">
          <button
            v-tooltip.top-center="'Open model instance for review'"
            type="button"
            class="btn btn-primary"
            @click="open(model.id)"
          ><i class="fa fa-folder-open-o" />
            Open Instance</button>
          <button
            v-tooltip.top-center="'Edit model instance publication'"
            type="button"
            class="btn btn-primary"
            @click="edit(model.id)"
          ><i class="fa fa-edit" />
            Publish (or Edit) Instance</button>
        </div>
        <div class="col-sm-2">
          <button
            v-tooltip.top-center="'Unpublish the model instance'"
            type="button"
            class="remove-button"
            @click.stop="showWarningModal"
          ><i class="fa fa-trash" />
            Unpublish</button>
        </div>
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
import { Model } from '@/types/Datacube';
import { DatacubeStatus } from '@/types/Enums';

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
    model: {
      type: Object as PropType<Model>,
      default: () => ({})
    }
  },
  computed: {
    ...mapGetters({
      project: 'app/project'
    }),
    statusColor(): any {
      let color = '';
      switch (this.model.status) {
        case DatacubeStatus.Ready:
          color = 'green';
          break;
        case DatacubeStatus.Registered:
          color = 'black';
          break;
        default:
          color = 'red';
      }
      return color;
    },
    statusLabel(): any {
      const label = this.model.status === DatacubeStatus.Ready ? 'Published' : this.model.status.toLowerCase();
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
  },
  setup() {
    const showMore = ref(false);
    const showModal = ref(false);

    return {
      showMore,
      showModal
    };
  },
  methods: {
    ...mapActions({
      clearLastQuery: 'query/clearLastQuery',
      updateAnalysisItemsNewPreview: 'dataAnalysis/updateAnalysisItemsNewPreview'
    }),
    dateFormatter,
    toggleShowMore() {
      this.showMore = !this.showMore;
    },
    remove() {
      this.$emit('delete', this.model);
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
        name: 'dataPreview'
      });
    },
    edit(id: string) {
      // Reset filters every time we edit
      this.clearLastQuery();
      // redirect
      this.$router.push({ name: 'modelPublishingExperiment', query: { datacubeid: id } });
    }
  }
});
</script>

<style scoped lang="scss">
@import "~styles/variables";

.project-card-container {
  cursor: pointer;
  background: #fcfcfc;
  border: 1px solid #dedede;
  margin: 1px 0;
  padding: 10px;
}

.project-card-container:hover {
  border-color: $selected;
  cursor: pointer;
}

.selected {
  border-left: 4px solid $selected;
  background-color: #ffffff;
}

.project-card-header {
  i {
    margin-left: 20px;
  }
  padding-bottom: 5px;
  padding-top: 5px;
}

.project-card-content {
  padding-bottom: 5px;
  .details {
    div {
      margin-left: 10px;
    }
  }
}

.project-name {
  max-width: 40ch;
  display: inline-block;
  text-align: left;
  text-decoration: underline;
}

.project-card-footer {
  padding-bottom: 5px;
  padding-top: 5px;
  .btn {
    margin-left: 20px;
    margin-right: 10px;
  }
}

.number-col {
  text-align: right;
  padding-right: 30px;
}

.remove-button {
  background: #F44336;
  color: white;
  font-weight: 600;
  border: none;
  padding: 8px 16px;
  user-select: none;
}
</style>
