import API from '@/api/api';
import { ApplicationConfiguration } from '@/types/ApplicationConfiguration';
import { convertStringToBoolean } from '@/utils/string-util';
import { onMounted } from 'vue';
import { useStore } from 'vuex';

// If the attempt to fetch the application configuration fails, check again
//  after a progressively longer delay. No fetch is attempted after the last
//  delay.
const RETRY_DELAY_LENGTHS_IN_SECONDS = [1, 5, 10, 30, 60, 0];

export const DEFAULT_APPLICATION_CONFIGURATION: ApplicationConfiguration = {
  CLIENT__IS_ANALYST_WORKFLOW_VISIBLE: true
};

const getConfiguration = async (): Promise<ApplicationConfiguration> => {
  const result = await API.get('client-settings', {});
  const config: ApplicationConfiguration = {
    CLIENT__IS_ANALYST_WORKFLOW_VISIBLE:
      DEFAULT_APPLICATION_CONFIGURATION.CLIENT__IS_ANALYST_WORKFLOW_VISIBLE
  };
  try {
    config.CLIENT__IS_ANALYST_WORKFLOW_VISIBLE = convertStringToBoolean(
      result.data.CLIENT__IS_ANALYST_WORKFLOW_VISIBLE
    );
  } catch (e) {
    console.error(e);
  }
  return config;
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
      `Unable to fetch application configuration after ${RETRY_DELAY_LENGTHS_IN_SECONDS.length} attempts.`
    );
  };

  onMounted(async () => {
    await tryToFetchConfiguration();
  });
}
