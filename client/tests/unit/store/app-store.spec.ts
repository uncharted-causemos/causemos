import { setActivePinia, createPinia } from 'pinia';
import { vi } from 'vitest';
import { useAppStore } from '@/stores/app-store';

// Mock vue-router since app-store uses useRoute() internally
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, params: {} }),
  useRouter: () => ({ push: vi.fn() }),
}));

describe('app-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('overlay state', () => {
    const store = useAppStore();

    store.disableOverlay();
    expect(store.overlayActivated).to.equal(false);

    store.enableOverlay('abc');
    expect(store.overlayActivated).to.equal(true);
  });

  it('overlay message', () => {
    const store = useAppStore();
    const testMessage = 'test overlay';

    expect(store.overlayActivated).to.equal(false);

    store.enableOverlay(testMessage);
    expect(store.overlayActivated).to.equal(true);
    expect(store.overlayMessage).to.equal(testMessage);
  });
});
