<template>
  <div>
    <div>{{ conceptSuffix(item) }}</div>
    <div class="concept-prefix">{{ conceptPrefix(item) }}</div>
  </div>
</template>

<script>
import { conceptPrefix, conceptSuffix } from '@/utils/concept-util';

export default {
  name: 'ConceptDisplay',
  props: {
    item: {
      type: String,
      required: true
    }
  },
  methods: {
    conceptPrefix,
    conceptSuffix
  }
};
</script>

<style lang="scss" scoped>
.concept-prefix {
  color: #888;
}
</style>
