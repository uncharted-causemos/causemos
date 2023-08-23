<template>
  <modal @close="close()">
    <template #header>
      <h4>Hidden countries</h4>
    </template>
    <template #body>
      <div class="container">
        <nav>
          <div class="country-col">Country</div>
          <div class="missing-from">Not covered by</div>
        </nav>
        <div class="rows">
          <div class="row" v-for="(country, index) in removedCountries" :key="index">
            <div class="country-name">{{ country.countryName }}</div>
            <div class="removed-from">
              <div v-for="(dataSource, index2) in country.removedFrom" :key="index2">
                {{ dataSource }}
              </div>
              <div v-if="country.removedFrom.length === 0">Not specified</div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button ref="close" type="button" class="btn first-button" @click.stop="close()">
          Close
        </button>
      </ul>
    </template>
  </modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Modal from '@/components/modals/modal.vue';

export default defineComponent({
  name: 'Removed Country Review',
  components: {
    Modal,
  },
  props: {
    removedCountries: Array<{ countryName: string; removedFrom: string[] }>,
  },
  emits: ['close'],
  mounted() {
    const el = this.$refs.close as HTMLButtonElement;
    el.focus();
  },
  methods: {
    close() {
      this.$emit('close', null);
    },
  },
});
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

    .country-col {
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
      .country-name {
        width: 40%;
      }
      .removed-from {
        width: 60%;
      }
    }
  }
}
</style>
