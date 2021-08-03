import { ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';
import { Ref, ref } from 'vue';
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

export function selectAdminLevel(metadata: Ref<Model | Indicator | null>) {
  const chosenLevel = ref((ADMIN_LEVEL_KEYS).slice().reverse()
    .filter(level => _.has(metadata.value?.geography, level))
    .findIndex(level => {
      return Object.keys((metadata.value?.geography as any)[level]).length > 1;
    }));
  return chosenLevel.value === -1 ? 0 : ADMIN_LEVEL_KEYS.length - chosenLevel.value - 1;
}
