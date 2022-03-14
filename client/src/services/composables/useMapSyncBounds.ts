import _ from 'lodash';
import { nextTick } from 'vue';

export default function useMapSyncBounds(emit: (event: 'sync-bounds', ...args: any[]) => void) {
  // Emit sync bounds event with the bound for the current map instance
  const syncBounds = (event: any) => {
    // Skip if move event is not originated from dom event (eg. not triggered by user interaction with dom)
    // We ignore move events from other maps which are being synced with the master map to avoid situation
    // where they also trigger prop updates and fire events again to create infinite loop
    const originalEvent = event.mapboxEvent.originalEvent;
    if (!originalEvent) return;

    const map = event.map;
    const component = event.component;

    // Disable camera movement until next tick so that the master map doesn't get updated by the props change
    // Master map is being interacted by user so camera movement is already applied
    component.disableCamera();

    emit('sync-bounds', map.getBounds().toArray());

    nextTick(() => {
      component.enableCamera();
    });
  };
  return {
    syncBounds
  };
}
