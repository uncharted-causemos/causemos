<template>
  <card
    class="insight"
    @click="selectInsight()"
  >
    <div class="insight-content">
      <div class="insight-thumbnail">
        <img
          :src="insight.thumbnail_source"
          class="thumbnail">
      </div>
      <div class="insight-title">
        <h5>{{ insight.title }}</h5>
      </div>
      <div class="insight-footer">
        <div class="insight-date">
          {{ dateFormatter(insight.modified_at, 'MMM DD, YYYY') }}
        </div>
        <div class="insight-action" @click.stop="openEditor()">
          <i class="fa fa-ellipsis-h insight-header-btn" />
          <insight-editor
            v-if="activeInsight === insight.id"
            @delete="deleteInsight()"
          />
      </div>
    </div>
    </div>
  </card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import InsightEditor from '@/components/insight-manager/insight-editor.vue';
import Card from '@/components/widgets/card.vue';
import dateFormatter from '@/formatters/date-formatter';
import stringFormatter from '@/formatters/string-formatter';

export default defineComponent({
  name: 'InsightCard',
  components: {
    InsightEditor,
    Card
  },
  props: {
    activeInsight: {
      type: String,
      default: ''
    },
    insight: {
      type: Object,
      default: null
    }
  },
  emits: ['delete-insight', 'open-editor', 'select-insight'],
  methods: {
    dateFormatter,
    stringFormatter,
    deleteInsight() {
      this.$emit('delete-insight');
    },
    openEditor() {
      this.$emit('open-editor');
    },
    selectInsight() {
      this.$emit('select-insight');
    }
  }
});

</script>

<style lang="scss" scoped>
.insight {
  cursor: pointer;
  padding: 5px 5px 10px;
  border: 1px solid #e5e5e5;
  max-width: 300px;
  margin: 0px 1rem 1rem 0px;
  .insight-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    .insight-title {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      width: 100%;
    }
    .insight-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .insight-header-btn {
        cursor: pointer;
        padding: 5px;
        color: gray;
      }
      .insight-action {
        flex: 0 1 auto;
      }
    }
    .insight-description {
      flex: 1 1 auto;
      align-self: stretch;
    }
    .insight-empty-description {
      flex: 1 1 auto;
      align-self: stretch;
      color: #D6DBDF;
    }
    .insight-thumbnail {
      .thumbnail {
        width:  100%;
      }
    }
  }
}
</style>
