<template>
  <div class="tableview-document-container"
    @click="showDocument">
    <div class="tableview-row">
      <div style="flex: 4;" class="number-col">
          <div v-tooltip="documentMeta.doc_title" class="row-field" v-if="checkString(documentMeta.doc_title)">{{ documentMeta.doc_title }}</div>
          <div v-tooltip="documentMeta.file_name" class="row-field" v-else-if="checkString(documentMeta.file_name)">{{ documentMeta.file_name }}</div>
          <i v-else class="fa fa-minus"/>
      </div>
      <div style="flex: 2;" class="number-col">
        <div class="row-field" v-if="checkDate(documentMeta.publication_date)">{{ dateFormatter(documentMeta.publication_date.date, 'yyyy-MM-DD') }}</div>
        <i v-else class="fa fa-minus"/>
      </div>
      <div style="flex: 3;" class="number-col">
        <div v-tooltip="documentMeta.author" class="row-field" v-if="checkString(documentMeta.author)">{{ documentMeta.author }}</div>
        <i v-else class="fa fa-minus"/>
      </div>
      <div style="flex: 3;" class="number-col">
        <div v-tooltip="documentMeta.publisher_name" class="row-field" v-if="checkString(documentMeta.publisher_name)">{{ documentMeta.publisher_name }}</div>
        <i v-else class="fa fa-minus"/>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent } from 'vue';
import dateFormatter from '@/formatters/date-formatter';

interface DateObj {
  date: number;
  month: number;
  year: number;
  day: number;
}

export default defineComponent({
  name: 'DocumentsListItem',
  props: {
    documentMeta: {
      type: Object,
      default: () => {}
    }
  },
  emits: ['document-click'],
  methods: {
    dateFormatter,
    showDocument(e: Event) {
      this.$emit('document-click', { event: e, docmeta: this.documentMeta });
    },
    checkString(item: string) {
      return item && item.length > 0;
    },
    checkDate(item: DateObj) {
      return item && item.date && !_.isNaN(item.date);
    }
  }
});
</script>

<style scoped lang="scss">
  @import '~styles/variables';

  .tableview-document-container {
    cursor: pointer;
    background: #fcfcfc;
    border: 1px solid #dedede;
    margin: 1px 0;
    padding: 10px;
  }

  .tableview-document-container:hover {
    border: 1px solid $selected;
    cursor: pointer;
  }

  .selected {
    border-left: 4px solid $selected;
    background-color: #ffffff;
  }
  .tableview-row {
    background: #fcfcfc;
    padding: 0;
    margin: 0;
    display: flex;
  }

  .row-field {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    //&:hover {
    //  background-color: pink;
    //}
  }
</style>
