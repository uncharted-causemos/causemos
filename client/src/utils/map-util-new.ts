import { ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';
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
  // availableAdminLevelTitles needs to change too because its total size needs to match the size of ADMIN_LEVEL_KEYS
  const filtered = [...ADMIN_LEVEL_KEYS].reverse()
    .filter(level => _.has(metadata?.geography, level));
  console.log(filtered);
  const chosenLevel = filtered
    .findIndex(level => Object.keys((metadata?.geography as any)[level]).length > 1);
  console.log(chosenLevel);
  return chosenLevel === -1 ? 0 : ADMIN_LEVEL_KEYS.length - chosenLevel - 1;
}
