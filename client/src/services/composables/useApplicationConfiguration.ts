import API from '@/api/api';
import { onMounted } from 'vue';
import { useStore } from 'vuex';

// If the attempt to fetch the application configuration fails, check again
//  after a progressively longer delay.
const RETRY_DELAY_LENGTHS_IN_SECONDS = [1, 5, 10, 30, 60];

const getConfiguration = async () => {
  const result = await API.get('app-settings', {});
  return result.data;
};

export default function useApplicationConfiguration() {
  const store = useStore();

  const tryToFetchConfiguration = async () => {
    for (const delayInSeconds of RETRY_DELAY_LENGTHS_IN_SECONDS) {
      try {
        // Fetch configuration
        const configuration = await getConfiguration();
        // On success, save it to the store
        store.dispatch('app/setApplicationConfiguration', configuration);
        return;
      } catch (e) {
        // On fail, retry after a progressively longer delay.
        console.error('Failed to fetch application configuration.', e);
        const delayInMilliseconds = delayInSeconds * 1000;
        await new Promise(resolve => setTimeout(resolve, delayInMilliseconds));
      }
    }
    console.error(
      `Unable to fetch application configuration after ${RETRY_DELAY_LENGTHS_IN_SECONDS.length + 1} attempts.`
    );
  };

  onMounted(async () => {
    await tryToFetchConfiguration();
  });
}
