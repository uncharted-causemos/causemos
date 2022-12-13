<template>
  <img ref="image" :src="imgSrc"/>
</template>

<script setup lang="ts">

import { defineProps, onMounted, watch, ref } from 'vue';
import useVisibleElementDetector from '@/services/composables/useVisibleElementDetector';

const props = defineProps<{ src: string }>();
const image = ref<Element>();
const imgSrc = ref('');
let stop = () => {};

const initDetector = () => {
  stop(); // clean up the previous detector
  stop = useVisibleElementDetector(image.value as Element, () => {
    imgSrc.value = props.src;
  });
};

onMounted(() => initDetector());
watch(() => props.src, () => initDetector());

</script>
