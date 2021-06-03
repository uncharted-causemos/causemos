<template>
  <div class="tableview-document-container"
    @click="showDocument">
    <div class="row tableview-row">
      <div class="col-sm-4 number-col">
        <div class="row-field" v-if="checkString(documentMeta.doc_title)">{{ documentMeta.doc_title }}</div>
        <div class="row-field" v-else-if="checkString(documentMeta.file_name)">{{ documentMeta.file_name }}</div>
        <i v-else class="fa fa-minus"/>
      </div>
      <div class="col-sm-2 number-col">
        <div class="row-field" v-if="checkDate(documentMeta.publication_date)">{{ getFormattedDate(documentMeta.publication_date.date) }}</div>
        <i v-else class="fa fa-minus"/>
      </div>
      <div class="col-sm-3 number-col">
        <div class="row-field" v-if="checkString(documentMeta.author)">{{ documentMeta.author }}</div>
        <i v-else class="fa fa-minus"/>
      </div>
      <div class="col-sm-3 number-col">
        <div class="row-field" v-if="checkString(documentMeta.publisher_name)">{{ documentMeta.publisher_name }}</div>
        <i v-else class="fa fa-minus"/>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';

export default {
  name: 'DocumentsListItem',
  props: {
    documentMeta: {
      type: Object,
      default: () => {}
    }
  },
  emits: ['document-click'],
  methods: {
    showDocument(e) {
      this.$emit('document-click', { event: e, docmeta: this.documentMeta });
    },
    checkString(item) {
      return item && item.length > 0;
    },
    checkDate(item) {
      return item && item.date && !_.isNaN(item.date);
    },
    getFormattedDate(item) {
      return new Date(item).toDateString();
    }
  }
};
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
  }

  .row-field {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
