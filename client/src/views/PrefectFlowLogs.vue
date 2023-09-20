<template>
  <div class="prefect-logs-modal-container">
    <full-screen-modal-header icon="angle-left" nav-back-label="Exit Logs" @close="closeModal">
    </full-screen-modal-header>

    <div>
      <div>
        <h3 style="text-align: center">
          Status: {{ flowLogs.state }} | Start Time: {{ flowLogs.start_time.toLocaleString() }} |
          End Time: {{ flowLogs.end_time?.toLocaleString() }} | Agent ID:
          {{ flowLogs.agent.id.toLocaleString() }}
        </h3>
        <ul style="list-style-type: none">
          <li v-for="({ timestamp, message }, i) in flowLogs.logs" :key="timestamp.toString() + i">
            <span style="font-size: small">{{ timestamp.toLocaleString() }}</span>
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
import { FlowLogs } from '@/types/Common';
import { fetchFlowLogs } from '@/services/datacube-service';

const DEFAULT_LOGS: FlowLogs = {
  state: '',
  start_time: new Date(),
  logs: [],
  agent: { id: '', labels: [] },
};
export default defineComponent({
  name: 'PrefectFlowLogs',
  components: {
    FullScreenModalHeader,
    MultilineDescription,
  },
  data: () => ({
    flowId: '',
    flowLogs: DEFAULT_LOGS,
  }),
  watch: {
    $route: {
      handler(/* newValue, oldValue */) {
        if (this.$route.name === 'prefectFlowLogs' && this.flowId !== this.$route.params.flowId) {
          this.flowId = this.$route.params.flowId as string;
          this.fetchInfo(this.flowId);
        }
      },
      immediate: true,
    },
  },
  methods: {
    closeModal() {
      this.$router.back();
    },
    async fetchInfo(flowId: string) {
      const logs = await fetchFlowLogs(flowId);
      this.flowLogs = logs || DEFAULT_LOGS;
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.prefect-logs-modal-container {
}

.body {
}
</style>
