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
          v-for="cag in availableCAGs"
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
        <li class="first-button">
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

<script>

import _ from 'lodash';
import Vue from 'vue';
import { mapGetters } from 'vuex';
import Modal from '@/components/modals/modal';
import Card from '@/components/widgets/card';
import modelService from '@/services/model-service';

export default {
  name: 'ModalImportCag',
  components: {
    Modal,
    Card
  },
  data: () => ({
    availableCAGs: []
  }),
  computed: {
    ...mapGetters({
      project: 'app/project',
      currentCAG: 'app/currentCAG'
    }),
    selectedCAGIds() {
      return this.availableCAGs.filter(d => d.selected === true).map(d => d.id);
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      modelService.getProjectModels(this.project).then(result => {
        this.availableCAGs = result.models.filter(d => d.id !== this.currentCAG);
      });
    },
    toggleCAGSelection(cag) {
      if (!cag.selected) {
        cag.selected = true;
      } else {
        cag.selected = false;
      }
      Vue.set(this, 'availableCAGs', _.clone(this.availableCAGs));
    },
    importCAG() {
      this.$emit('import-cag', this.selectedCAGIds);
    },
    close() {
      this.$emit('close', null);
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

/deep/ .modal-header {
  background-color: #E1FAEB;
}

.first-button {
  margin-right: 10px;
}

/deep/ .modal-container {
  overflow: hidden;
  width: 960px;
}

/deep/ .modal-body {

  .available-cags-container {
    display: flex;
    flex-wrap: wrap;
    max-height: 400px;
    overflow-y: scroll;

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
