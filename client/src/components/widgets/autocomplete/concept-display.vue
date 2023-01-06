<template>
  <div>
    <div>{{ conceptSuffix(item) }}</div>
    <div class="concept-prefix">{{ conceptPrefix(item) }}</div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { conceptPrefix, conceptSuffix } from '@/utils/concept-util';

export default defineComponent({
  name: 'ConceptDisplay',
  props: {
    item: {
      type: String,
      required: true,
    },
  },
  methods: {
    conceptPrefix,
    conceptSuffix,
  },
});
</script>

<style lang="scss" scoped>
.concept-prefix {
  color: #888;
}
</style>
