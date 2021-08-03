import { ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';
import { ref } from 'vue';
import { Indicator, Model } from '@/types/Datacube';
import _ from 'lodash';

export enum BASE_LAYER {
  SATELLITE = 'satellite',
  DEFAULT = 'default'
}

export enum DATA_LAYER {
  ADMIN = 'admin',
  TILES = 'tiles'
}

export function selectAdminLevel(metadata: Model | Indicator | null) {
  const chosenLevel = ref([...ADMIN_LEVEL_KEYS].reverse()
    .filter(level => _.has(metadata?.geography, level))
    .findIndex(level => Object.keys((metadata?.geography as any)[level]).length > 1));
  console.log(chosenLevel);
  return chosenLevel.value === -1 ? 0 : ADMIN_LEVEL_KEYS.length - chosenLevel.value - 1;
}
