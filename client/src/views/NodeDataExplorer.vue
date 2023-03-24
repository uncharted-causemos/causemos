<template>
  <DataExplorer
    :nav-back-label="navBackLabel"
    :complete-button-label="selectLabel"
    :enable-multiple-selection="false"
    @close="onClose"
    @complete="selectData"
  />
</template>
<script lang="ts">
import { defineComponent, ref, Ref } from 'vue';
import { mapGetters } from 'vuex';

import DataExplorer from '@/components/data-explorer/data-explorer.vue';

import modelService from '@/services/model-service';

import { ProjectType } from '@/types/Enums';
import { CAGGraph } from '@/types/CAG';
import { Datacube } from '@/types/Datacube';

export default defineComponent({
  name: 'NodeDataExplorer',
  components: {
    DataExplorer,
  },
  setup() {
    const modelComponents = ref(null) as Ref<CAGGraph | null>;
    const selectLabel = 'Quantify Node';

    return {
      modelComponents,
      selectLabel,
    };
  },
  computed: {
    ...mapGetters({
      currentCAG: 'app/currentCAG',
      nodeId: 'app/nodeId',
      project: 'app/project',
    }),
    selectedNode() {
      if (this.nodeId === undefined || this.modelComponents === null) {
        return null;
      }
      return this.modelComponents.nodes.find((node) => node.id === this.nodeId);
    },
    nodeConceptName() {
      return this.selectedNode?.label;
    },
    navBackLabel() {
      return `Back to ${this.nodeConceptName} Node`;
    },
  },
  mounted() {
    this.refresh();
  },
  methods: {
    async refresh() {
      this.modelComponents = await modelService.getComponents(this.currentCAG);
    },
    onClose() {
      this.$router.push({
        name: 'nodeDrilldown',
        params: {
          currentCAG: this.currentCAG,
          nodeId: this.nodeId,
          project: this.project,
          projectType: ProjectType.Analysis,
        },
      });
    },
    selectData(selectedDatacubes: Datacube[]) {
      this.$router.push({
        name: 'nodeDataDrilldown',
        params: {
          currentCAG: this.currentCAG,
          indicatorId: selectedDatacubes[0].id,
          nodeId: this.nodeId,
          project: this.project,
          projectType: ProjectType.Analysis,
        },
      });
    },
  },
});
</script>

<style lang="scss" scoped></style>
