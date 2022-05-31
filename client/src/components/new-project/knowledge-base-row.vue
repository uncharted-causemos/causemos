<template>
  <tbody>
    <tr
      class="knowledge-base-row-container"
      :class="{'active': kb.id === baseKb}"
      @click="toggleShowMore"
    >
      <td>
        <i
          :class="{ 'fa fa-fw fa-angle-right': !showMore, 'fa fa-fw fa-angle-down': showMore }"
        />
        <label
          :for="kb.id"
          @click.stop="selectKB"
        >
          <input
            :id="kb.id"
            :value="kb.id"
            :checked="kb.id === baseKb"
            type="radio"
            name="knowledge-base"
          >{{ displayName() }}
        </label>
      </td>
      <td>{{ documentCount() }}</td>
      <td>{{ readers() }}</td>
      <td>{{ dateFormatter(kb.created_at) }}</td>
    </tr>
    <tr
      v-if="showMore"
      class="show-more-section"
    >
      <td colspan="3">
        <p class="field-title">Description</p>
        <p>{{ description() }}</p>
      </td>
      <td colspan="1">
        <p class="field-title">Assembly details</p>
        <p><span class="field-subtitle">level: </span>{{ assemblyLevel() }}</p>
        <p><span class="field-subtitle">grounding threshold: </span>{{ groundingThreshold() }}</p>
      </td>
    </tr>
  </tbody>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent } from 'vue';
import numberFormatter from '@/formatters/number-formatter';
import dateFormatter from '@/formatters/date-formatter';

export default defineComponent({
  name: 'KnowledgeBaseRow',
  props: {
    kb: {
      type: Object,
      default: () => {}
    },
    baseKb: {
      type: String,
      default: null
    }
  },
  data: () => ({
    showMore: false
  }),
  methods: {
    dateFormatter,
    toggleShowMore() {
      this.showMore = !this.showMore;
    },
    selectKB() {
      this.$emit('select');
    },
    displayName() {
      const name = _.get(this.kb, 'corpus_parameter.display_name', this.kb.corpus_id);
      return _.isNil(name) ? this.kb.id : name;
    },
    documentCount() {
      const numDocuments = _.get(this.kb, 'corpus_parameter.num_documents');
      return _.isNil(numDocuments)
        ? '--'
        : numberFormatter(numDocuments);
    },
    readers() {
      const readers = _.get(this.kb, 'corpus_parameter.readers');
      return _.isNil(readers)
        ? '--'
        : '[' +
          readers.reduce((acc: string, reader: string) => acc + ', ' + reader) +
        ']';
    },
    description() {
      return _.get(this.kb, 'corpus_parameter.description', '--');
    },
    assemblyLevel() {
      return _.get(this.kb, 'corpus_parameter.assembly.level', '--');
    },
    groundingThreshold() {
      return _.get(this.kb, 'corpus_parameter.assembly.grounding_threshold', '--');
    }
  }
});
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.knowledge-base-row-container {
  background: $background-light-1;
  border-left: 4px solid transparent;
  cursor: pointer;

  &.active {
    border-left-color: #255DCC;
  }

  input[type="radio"] {
    margin: 0 8px;
  }

  label {
    margin: 0;
    font-weight: normal;
    text-decoration: underline;
    cursor: pointer;
  }
}

tbody:before {
  height: 4px;
  display: table-row;
  content: '';
  background-color: transparent;
}

td {
  padding: 12px;
}

.show-more-section {
  display: table-row;
  background-color: #FFF;
  vertical-align: top;

  .field-title {
    font-weight: bold;
  }
  .field-subtitle {
    color: #747576;
  }
}
</style>
