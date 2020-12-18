<template>
  <card
    class="overview-card-container"
    @click="onClick"
  >
    <h3>
      <i
        class="fa fa-fw"
        :class="[icon]"
      />{{ title }}
    </h3>
    <div class="metrics">
      <div
        v-for="(metric, index) of metrics"
        :key="index"
        class="metric"
      >
        <h4>{{ metric.name }}</h4>
        <h5>{{ displayValue(metric.value) }}</h5>
      </div>
    </div>
  </card>
</template>

<script>
import Card from '@/components/widgets/card';
import numberFormatter from '@/filters/number-formatter';

export default {
  name: 'OverviewCard',
  components: {
    Card
  },
  props: {
    icon: {
      type: String,
      default: 'fa-question'
    },
    title: {
      type: String,
      default: '[Card Title]'
    },
    metrics: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    onClick() {
      this.$emit('click');
    },
    displayValue(value) {
      return value === undefined
        ? '...'
        : numberFormatter(value);
    }
  }
};
</script>

<style lang="scss" scoped>
.overview-card-container {
  width: 100%;
  display: flex;
  flex-direction: column;

  &:hover h3 {
    background: lighten(#15223D, 10%);
  }
}

h3 {
  background: #15223D;
  color: #FFF;
  padding: 20px 24px;
  margin: 0;
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  transition: background 0.15s;

  i {
    margin-right: 12px;
    position: relative;
    top: 1px;
  }
}

.metric {
  padding: 20px 40px;
  h4 {
    font-size: 18px;
    color: #AAA;
    font-weight: normal;
    margin: 0;
  }
  h5 {
    font-family: 'Oswald', Arial, Helvetica, sans-serif;
    font-size: 48px;
    margin: 0;
  }

  &:not(:first-child) {
    border-top: 1px solid #EAEBEC;
  }
}
</style>
