<template>
  <div class="prefect-logs-modal-container">
    <full-screen-modal-header
      icon="angle-left"
      nav-back-label="Exit Logs"
      @close="closeModal"
    >
    </full-screen-modal-header>

    <div>
      <div>
        <h3 style="text-align: center">Status: {{flowInfo.state}}
          | Start Time: {{flowInfo.start_time.toLocaleString()}}
          | End Time: {{flowInfo.end_time?.toLocaleString()}}
          | Agent ID: {{flowInfo.agent.id.toLocaleString()}}
        </h3>
        <ul style="list-style-type: none">
          <li
            v-for="{timestamp, message} in flowInfo.logs"
            :key="timestamp">
            <span style="font-size: small">{{timestamp.toLocaleString()}}</span>
            <multiline-description :text="message" />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import FullScreenModalHeader from '@/components/widgets/full-screen-modal-header.vue';
import MultilineDescription from '@/components/widgets/multiline-description.vue';
import { /* ref, watch, toRefs, Ref, */ defineComponent } from 'vue';
import { FlowInfo } from '@/types/Common';
import { fetchFlowInfo } from '@/services/new-datacube-service';

const DEFAULT_INFO: FlowInfo = { state: '', start_time: new Date(), logs: [], agent: { id: '', labels: [] } };
export default defineComponent({
  name: 'PrefectFlowInfo',
  components: {
    FullScreenModalHeader,
    MultilineDescription
  },
  data: () => ({
    flowId: '',
    flowInfo: DEFAULT_INFO
  }),
  watch: {
    $route: {
      handler(/* newValue, oldValue */) {
        if (this.$route.name === 'prefectFlowInfo' && this.flowId !== this.$route.params.flowId) {
          this.flowId = this.$route.params.flowId as string;
          this.fetchInfo(this.flowId);
        }
      },
      immediate: true
    }
  },
  methods: {
    closeModal() {
      this.$router.back();
    },
    async fetchInfo(flowId: string) {
      const info = await fetchFlowInfo(flowId);
      this.flowInfo = info || DEFAULT_INFO;
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.prefect-logs-modal-container {

}

.body {

}

</style>
