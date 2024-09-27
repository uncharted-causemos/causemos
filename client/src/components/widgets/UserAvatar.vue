<template>
  <Avatar
    :label="initials"
    shape="circle"
    :class="props.classDefinition"
    :size="props.size"
    @click="props.onAvatarClick"
  />
</template>
<script setup lang="ts">
import Avatar from 'primevue/avatar';
import { computed, PropType } from 'vue';

const props = defineProps({
  accountName: {
    type: String,
    required: true,
  },
  classDefinition: {
    type: String,
    required: false,
    default: 'border-1 border-primary',
  },
  size: {
    type: String as PropType<'normal' | 'large' | 'xlarge' | undefined>,
    required: false,
    default: 'normal',
  },
  onAvatarClick: {
    type: Function as PropType<(e: MouseEvent) => void>,
    required: false,
    default: () => {},
  },
});

const initials = computed(() => {
  const names = props.accountName.split(' ');
  return names.map((name) => (name[0] ?? '').toLocaleUpperCase()).join('');
});
</script>
