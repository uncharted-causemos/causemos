<template>
  <div :class="{ 'project-card-container': !showMore, 'project-card-container selected': showMore }">
    <modal-confirmation
      v-if="showModal"
      :autofocus-confirm="false"
      @confirm="remove"
      @close="showModal = false"
    >
      <div slot="title">Delete Project</div>
      <div slot="message">
        <p>Are you sure you want to delete <strong>{{ project.name }}</strong> and all associated CAGs/Models/Scenarios?</p>
        <message-display
          :message="'Warning: This action cannot be undone.'"
          :message-type="'alert-warning'"
        />
      </div>
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
          @click="open(project.id)">
          <text-display
            :text="project.name"
            :max="40" />
        </button>
      </div>
      <div class="col-sm-2 number-col">
        {{ dataAnalysisCount }}
      </div>
      <div class="col-sm-2 number-col">
        {{ modelCount }}
      </div>
      <div class="col-sm-2">
        {{ project.corpus_id }}
      </div>
      <div class="col-sm-2">
        {{ dateFormatter(project.modified_at) }}
      </div>
    </div>
    <div
      v-if="showMore"
      class="container-fluid project-card-content"
      @click="toggleShowMore()">
      <div class="row">
        <div class="col-sm-12 details">
          <div>
            <p><b>No additional information is available</b></p>
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
            v-tooltip.top-center="'Open the project'"
            type="button"
            class="btn btn-primary"
            @click="open(project.id)"
          ><i class="fa fa-folder-open-o" />
            Open Project</button>
        </div>
        <div class="col-sm-2">
          <button
            v-tooltip.top-center="'Remove the project from the list'"
            type="button"
            class="remove-button"
            @click.stop="showWarningModal"
          ><i class="fa fa-trash" />
            Remove Project</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

import { mapActions } from 'vuex';

import ModalConfirmation from '@/components/modals/modal-confirmation';
import TextDisplay from '@/components/widgets/text-display';

import messagesUtil from '@/utils/messages-util';
import MessageDisplay from './widgets/message-display.vue';
import dateFormatter from '@/formatters/date-formatter';

/**
 * A card-styled widget to view project summary
 */
export default {
  name: 'ProjectCard',
  components: {
    TextDisplay,
    ModalConfirmation,
    MessageDisplay
  },
  props: {
    project: {
      type: Object,
      default: () => ({})
    }
  },
  data: () => ({
    showMore: false,
    showModal: false,
    REMOVE_PROJECT_MESSAGE: messagesUtil.REMOVE_PROJECT_MESSAGE
  }),
  computed: {
    modelCount: function() {
      return this.project.stat.model_count;
    },
    dataAnalysisCount: function() {
      return this.project.stat.data_analysis_count;
    }
  },
  methods: {
    ...mapActions({
      clearLastQuery: 'query/clearLastQuery'
    }),
    dateFormatter,
    toggleShowMore() {
      this.showMore = !this.showMore;
    },
    remove() {
      this.$emit('delete', this.project);
      this.showModal = false;
    },
    showWarningModal() {
      this.showModal = true;
    },
    closeWarning() {
      this.showModal = false;
    },
    open(id) {
      // Reset filters every time we open a new project
      this.clearLastQuery();
      this.$router.push({ name: 'overview', params: { project: id } });
    }
  }
};
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
  border: 1px solid $selected;
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
