<template>
  <card
    class="insight"
    :class="{ 'card-mode': cardMode }"
  >
    <div class="insight-content">
      <div
        class="insight-thumbnail"
        @click="selectInsight()"
      >
        <img
          v-if="insight.thumbnail"
          :src="insight.thumbnail"
          class="thumbnail">
        <i v-else class="fa fa-spin fa-spinner" />
      </div>
      <div
        v-if="showDescription"
        :class="{ 'private-insight-title': insight.visibility === 'private' }">
        <span>{{ insight.name }}</span> <span class="insight-description">{{ insight.description }}</span>
      </div>
      <div
        v-else
        class="insight-title"
        :class="{ 'private-insight-title': insight.visibility === 'private' }">
        <h5>{{ insight.name }}</h5>
      </div>
      <div class="insight-footer">
        <div v-if="cardMode" class="insight-checkbox" @click="updateCuration()">
          <label>
            <i
              class="fa fa-lg fa-fw"
              :class="{ 'fa-check-square-o': curated, 'fa-square-o': !curated }"
            />
          </label>
        </div>
        <div class="insight-date">
          {{ dateFormatter(insight.modified_at, 'MMM DD, YYYY') }}
        </div>
        <div class="insight-action" @click.stop="openEditor()">
          <i class="fa fa-ellipsis-h insight-header-btn" />
          <insight-editor
            v-if="activeInsight === insight.id"
            @edit="editInsight()"
            @remove="removeInsight()"
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
    },
    cardMode: {
      type: Boolean,
      default: false
    },
    curated: {
      type: Boolean,
      default: false
    },
    showDescription: {
      type: Boolean,
      default: false
    }
  },
  emits: ['remove-insight', 'edit-insight', 'open-editor', 'select-insight', 'update-curation'],
  methods: {
    dateFormatter,
    stringFormatter,

    editInsight() {
      this.$emit('edit-insight');
    },
    removeInsight() {
      this.$emit('remove-insight');
    },
    openEditor() {
      this.$emit('open-editor');
    },
    selectInsight() {
      this.$emit('select-insight');
    },
    updateCuration() {
      this.$emit('update-curation');
    }
  }
});

</script>

<style lang="scss" scoped>
.card-mode {
  max-width: 300px;
}

.insight {
  cursor: pointer;
  padding: 5px;
  border: 1px solid #e5e5e5;
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
      color: gray;
      font-style: italic;
    }
    .private-insight-title {
      color: black;
      font-style: normal;
    }
    .insight-description {
      flex: 1 1 auto;
      color: gray;
      font-style: italic;
    }
    .insight-footer {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      .insight-checkbox {
        flex: 0 1 auto;
      }
      .insight-action {
        flex: 1 1 auto;
        text-align: right;
        .insight-header-btn {
          cursor: pointer;
          padding: 5px;
          color: gray;
        }
      }
    }
    .insight-thumbnail {
      .thumbnail {
        margin: auto;
        width:  100%;
        max-width: 700px;
      }
    }
  }
}
</style>
