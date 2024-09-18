<template>
  <modal @close="close">
    <template #header>
      <h4>Hidden regions</h4>
    </template>
    <template #body>
      <div class="container">
        <nav>
          <div class="region-col">Region</div>
          <div class="missing-from">Not covered by</div>
        </nav>
        <div class="rows">
          <div class="row" v-for="region in removedRegions" :key="region.regionId">
            <div class="region-name">{{ getFullRegionIdDisplayName(region.regionId) }}</div>
            <div class="removed-from">
              <div v-for="(dataSource, i) in region.removedFrom" :key="i">
                {{ dataSource }}
              </div>
              <div v-if="region.removedFrom.length === 0">Not specified</div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button ref="closeButton" type="button" class="btn first-button" @click.stop="close">
          Close
        </button>
      </ul>
    </template>
  </modal>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Modal from '@/components/modals/modal.vue';
import { getFullRegionIdDisplayName } from '@/utils/admin-level-util';

defineProps<{ removedRegions: Array<{ regionId: string; removedFrom: string[] }> }>();

const emit = defineEmits<{ (e: 'close'): void }>();

const closeButton = ref<HTMLButtonElement>();

onMounted(() => {
  closeButton.value?.focus();
});

const close = () => {
  emit('close');
};
</script>

<style scoped lang="scss">
@import '@/styles/uncharted-design-tokens';

:deep(.modal-container) {
  width: max-content;
  max-width: 80vw;
  .modal-body {
    height: 400px;
    overflow-y: scroll;
  }
}

.first-button {
  margin-right: 10px;
}

.container {
  width: 70vh;

  nav {
    color: $un-color-black-40;
    display: flex;
    flex-direction: row;
    gap: 10px;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid $un-color-black-40;

    .region-col {
      width: 40%;
    }

    .missing-from {
      width: 60%;
    }
    div.removed-row {
      display: flex;
      flex-direction: column;
      gap: 10px;
      div {
        color: red;
        width: 50%;
      }
    }
  }
  .rows {
    .row {
      margin-bottom: 8px;
      display: flex;
      flex-direction: row;
      gap: 10px;
      .region-name {
        width: 40%;
      }
      .removed-from {
        width: 60%;
      }
    }
  }
}
</style>
