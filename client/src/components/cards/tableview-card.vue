<template>
  <div class="tableview-card-container"
    @click="showDocument">
    <div class="row tableview-row">
      <div class="col-sm-1 number-col">
        <small-icon-button>
          <i class="fa fa-book fa-lg" />
        </small-icon-button>
      </div>
      <div class="col-sm-3 number-col">
        <div v-if="checkString(card.title)">{{ card.title }}</div>
        <i v-else class="fa fa-minus"/>
      </div>
      <div class="col-sm-2 number-col">
        <div v-if="checkString(card['metadata'].Publication)">{{ card['metadata'].Publication }}</div>
        <i v-else class="fa fa-minus"/>
      </div>
      <div class="col-sm-3 number-col">
        <div v-if="checkString(card.subtitle[0])">{{ card.subtitle[0] }}</div>
        <i v-else class="fa fa-minus"/>
      </div>
      <div class="col-sm-3 number-col">
        <div v-if="checkString(card.summary)">{{ card.summary }}</div>
        <i v-else class="fa fa-minus"/>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'tableview-card',
  props: {
    card: {
      type: Object,
      default: () => {}
    }
  },
  emits: ['rowcard-click'],
  methods: {
    showDocument(e) {
      console.log(JSON.stringify(e));
      console.log(JSON.stringify(this.card));
      this.$emit('rowcard-click', { event: e, card: this.card });
    },
    checkString(item) {
      return item && item.length > 0;
    },
    openReader(targetCard) {
      if (!targetCard.isExpanded) {
        this.cards.openReader(targetCard);
      }
    },
    registerCardsEvents() {
      this.cards.on('card:click', card => {
        this.$emit('card-click', card);
      });
    }
  }
};
</script>

<style scoped lang="scss">
  @import '~styles/variables';

  .tableview-card-container {
    cursor: pointer;
    background: #fcfcfc;
    border: 1px solid #dedede;
    margin: 1px 0;
    padding: 10px;
  }

  .tableview-card-container:hover {
    border: 1px solid $selected;
    cursor: pointer;
  }

  .selected {
    border-left: 4px solid $selected;
    background-color: #ffffff;
  }
  .tableview-row {
    background: #fcfcfc;
    padding: 10px;
    margin: 0;
  }
</style>
