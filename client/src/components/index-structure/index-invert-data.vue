<template>
  <h4 @click="emit('toggle-inverted')" class="clickable">
    <i
      class="fa fa-fw"
      :class="{
        'fa-check-square-o': props.isInverted,
        'fa-square-o': !props.isInverted,
      }"
    />
    Invert data
  </h4>
  <p>
    <span class="de-emphasized">
      Higher <strong>{{ props.selectedNodeName }}</strong> values indicate
    </span>
    <strong>
      {{ props.isInverted ? 'lower ' : 'higher ' }}
    </strong>
    <span class="de-emphasized">
      <strong>{{ props.outputIndexName }}</strong> values.
    </span>
  </p>
</template>

<script setup lang="ts">
const props = defineProps<{
  selectedNodeName: string;
  outputIndexName: string;
  isInverted: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-inverted'): void;
}>();
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';

.clickable {
  cursor: pointer;
  user-select: none;
}

.de-emphasized {
  color: $un-color-black-40;
}
</style>
