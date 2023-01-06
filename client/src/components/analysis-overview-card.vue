<template>
  <card class="project-card-container" :is-hoverable="false">
    <div class="project-card-row" @click="openAnalysis()">
      <div class="project-card-column extra-wide">
        <h4>{{ analysis.title }}</h4>
        <img
          v-if="analysis.previewImageSrc !== null"
          class="thumbnail-image"
          :src="analysis.previewImageSrc"
        />
      </div>
      <div class="project-card-column">
        <div>{{ analysis.subtitle }}</div>
        <div class="description">{{ analysis.description }}</div>
      </div>
      <div class="project-card-column">
        <span class="instance-header">{{
          analysis.type === 'quantitative' ? 'Datacubes' : 'Concepts'
        }}</span>
        <div>
          {{ analysis.type === 'quantitative' ? analysis.datacubesCount : analysis.nodeCount }}
        </div>
      </div>
      <div class="project-card-column">
        <span class="instance-header">{{
          analysis.type === 'quantitative' ? '' : 'Relations'
        }}</span>
        <div>{{ analysis.type === 'quantitative' ? '' : analysis.edgeCount }}</div>
      </div>
      <options-button :wider-dropdown-options="true" :dropdown-below="true">
        <template #content>
          <div class="dropdown-option" @click="openAnalysis">
            <i class="fa fa-fw fa-folder-open-o" /> Open
          </div>
          <div class="dropdown-option" @click="editAnalysis">
            <i class="fa fa-fw fa-edit" /> Rename
          </div>
          <div class="dropdown-option" @click="duplicateAnalysis">
            <i class="fa fa-fw fa-copy" /> Duplicate
          </div>
          <div class="dropdown-option destructive" @click="showWarningModal">
            <i class="fa fa-fw fa-trash" /> Delete
          </div>
        </template>
      </options-button>
    </div>
    <modal-confirmation
      v-if="showModal"
      :autofocus-confirm="false"
      @confirm="deleteAnalysis"
      @close="showModal = false"
    >
      <template #title>Remove analysis</template>
      <template #message>
        <p>
          Are you sure you want to remove <strong>{{ analysis.title }}</strong
          >?
        </p>
        <message-display
          :message="'Warning: This action cannot be undone.'"
          :message-type="'alert-warning'"
        />
      </template>
    </modal-confirmation>
  </card>
</template>

<script lang="ts">
import { defineComponent, ref, PropType } from 'vue';
import { mapActions, mapGetters } from 'vuex';

import ModalConfirmation from '@/components/modals/modal-confirmation.vue';

import MessageDisplay from './widgets/message-display.vue';
import dateFormatter from '@/formatters/date-formatter';
import Card from './widgets/card.vue';
import OptionsButton from './widgets/options-button.vue';

interface AnalysisOverviewCard {
  id: string;
  previewImageSrc: string | null;
  title: string;
  subtitle: string;
  description: string;
  type: string; // e.g., qualitative, quantitative
}

/**
 * A card-styled widget to view project summary
 */
export default defineComponent({
  name: 'AnalysisOverviewCard',
  components: {
    ModalConfirmation,
    MessageDisplay,
    Card,
    OptionsButton,
  },
  emits: ['open', 'rename', 'delete', 'duplicate'],
  props: {
    analysis: {
      type: Object as PropType<AnalysisOverviewCard>,
      default: () => ({}),
    },
  },
  computed: {
    ...mapGetters({
      project: 'app/project',
    }),
  },
  setup() {
    const showModal = ref(false);
    const showMore = ref(false);

    return {
      showModal,
      showMore,
    };
  },
  methods: {
    ...mapActions({
      clearLastQuery: 'query/clearLastQuery',
    }),
    dateFormatter,
    deleteAnalysis() {
      this.$emit('delete');
      this.showModal = false;
    },
    showWarningModal() {
      this.showModal = true;
    },
    closeWarning() {
      this.showModal = false;
    },
    openAnalysis() {
      // Reset filters every time we open
      this.clearLastQuery();
      this.$emit('open');
    },
    editAnalysis() {
      // Reset filters every time we edit
      this.clearLastQuery();
      this.$emit('rename');
    },
    duplicateAnalysis() {
      // Reset filters every time we edit
      this.clearLastQuery();
      this.$emit('duplicate');
    },
    toggleShowMore() {
      this.showMore = !this.showMore;
    },
  },
});
</script>

<style scoped lang="scss">
@import '~styles/variables';
.project-card-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  cursor: pointer;

  &:hover h4 {
    color: $selected-dark;
  }
}

h4 {
  margin: 0;
  font-size: $font-size-large;
}

.project-card-row {
  display: flex;
}

.project-card-column {
  flex: 1;
  min-width: 0;

  &.extra-wide {
    flex: 2;
  }

  .description,
  .thumbnail-image {
    margin-top: 5px;
  }
}

.thumbnail-image {
  height: 150px;
  border: 1px solid $separator;
}

.instance-header {
  @include header-secondary;
  font-weight: bold;
}

.destructive {
  color: $negative;
}
</style>
