<template>
  <div>
    <div v-if="!show">
      <span>
        {{ truncate(text) }}
      </span>
      <a
        v-if="text.length >= max"
        @click="toggle()">
        <br>Show More
      </a>
    </div>
    <div v-if="show">
      <span>{{ text }} </span>
      <a
        v-if="text.length >= max"
        @click="toggle()">
        <br>Show Less
      </a>
    </div>
  </div>
</template>

<script>
import StringUtil from '@/utils/string-util';

export default {
  name: 'TruncateText',
  props: {
    text: {
      type: String,
      required: true
    },
    max: {
      type: Number,
      default: 200
    }
  },
  data: () => ({
    show: false
  }),
  methods: {
    truncate(string) {
      return StringUtil.truncateString(string, this.max);
    },
    toggle() {
      this.show = !this.show;
    }
  }
};
</script>

<style scoped lang="scss">
  a {
    cursor: pointer;
  }
</style>
