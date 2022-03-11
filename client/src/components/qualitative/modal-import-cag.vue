<template>
  <modal
    :show-close-button="true"
    @close="close()">
    <template #header>
      <h4> Import CAGs into workspace </h4>
    </template>
    <template #body>
      <div class="available-cags-container">
        <card
          v-for="cag in compatibleCAGs"
          :key="cag.id"
          :class="{ 'selected': cag.selected ? true : false }"
          @click="toggleCAGSelection(cag)">
          <div
            class="preview">
            <img :src="cag.thumbnail_source">
          </div>
          <h5>{{ cag.name }}</h5>
        </card>
      </div>
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <span v-if="compatibleCAGs.length < allCAGs.length - 1">
          Only
          {{ currentTimeScale === TimeScale.Years ? "yearly" : "monthly" }}
          CAGs are shown.
        </span>
        <li>
          <button
            type="button"
            class="btn"
            @click.stop="close()">Cancel
          </button>
        </li>
        <li>
          <button
            type="button"
            :disabled="selectedCAGIds.length === 0"
            class="btn btn-primary btn-call-for-action"
            @click.stop="importCAG()">Import CAG
          </button>
        </li>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">

import { defineComponent, ref, computed, Ref } from 'vue';
import { useStore } from 'vuex';
import Modal from '@/components/modals/modal.vue';
import Card from '@/components/widgets/card.vue';
import modelService from '@/services/model-service';
import { CAGModelSummary } from '@/types/CAG';
import { TimeScale } from '@/types/Enums';

interface SelectableCAGModelSummary extends CAGModelSummary {
  selected?: boolean;
}

export default defineComponent({
  name: 'ModalImportCag',
  components: {
    Modal,
    Card
  },
  emits: [
    'import-cag', 'close'
  ],
  setup() {
    const store = useStore();
    const allCAGs = ref([]) as Ref<SelectableCAGModelSummary[]>;

    const project = computed(() => store.getters['app/project']);
    const currentCAG = computed(() => store.getters['app/currentCAG']);
    const currentTimeScale = computed(
      () =>
        allCAGs.value.find(cag => cag.id === currentCAG.value)?.parameter
          .time_scale
    );
    const compatibleCAGs = computed(() => {
      return allCAGs.value
        .filter(d => d.id !== currentCAG.value)
        .filter(d => d.parameter.time_scale === currentTimeScale.value);
    });
    const selectedCAGIds = computed(() => {
      return compatibleCAGs.value.filter(d => d.selected === true).map(d => d.id);
    });

    return {
      project,
      currentCAG,
      compatibleCAGs,
      currentTimeScale,
      allCAGs,
      selectedCAGIds,
      TimeScale
    };
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      modelService.getProjectModels(this.project).then(result => {
        this.allCAGs = result.models;
      });
    },
    toggleCAGSelection(cag: SelectableCAGModelSummary) {
      if (!cag.selected) {
        cag.selected = true;
      } else {
        cag.selected = false;
      }
    },
    importCAG() {
      this.$emit('import-cag', this.selectedCAGIds);
    },
    close() {
      this.$emit('close', null);
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.unstyled-list > *:not(:first-child) {
  margin-left: 10px;
}

::v-deep(.modal-container) {
  overflow: hidden;
  width: 960px;
}

::v-deep(.modal-body) {

  .available-cags-container {
    display: flex;
    flex-wrap: wrap;
    max-height: 400px;
    overflow-y: auto;

    .card-container {
      height: 220px;
      width: 220px;
      padding: 8px;
      margin: 5px;

      .preview {
        width: 100%;
        height: 160px;

        img {
          object-fit: cover;
          height: 100%;
          width: 100%;
        }
      }

      &.selected {
        border: 2px solid $selected;
      }
    }

  }
}

</style>
