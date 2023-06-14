import API from '@/api/api';
import { ApplicationConfiguration } from '@/types/ApplicationConfiguration';
import { convertStringToBoolean } from '@/utils/string-util';
import { onMounted } from 'vue';
import { useStore } from 'vuex';
import _ from 'lodash';

// If the attempt to fetch the application configuration fails, check again
//  after a progressively longer delay. No fetch is attempted after the last
//  delay.
const RETRY_DELAY_LENGTHS_IN_SECONDS = [1, 5, 10, 30, 60, 0];

export const DEFAULT_APPLICATION_CONFIGURATION: ApplicationConfiguration = {
  CLIENT__IS_ANALYST_WORKFLOW_VISIBLE: true,
  CLIENT__DOJO_LOG_API_URL: 'https://phantom.dojo-test.com',
  CLIENT__HIDE_SEARCH_KNOWLEDGE_BASE: false,
  CLIENT__HIDE_ADD_DOCUMENT_BUTTON: true,
};

const parseBoolean = (val: string) => {
  try {
    return convertStringToBoolean(val);
  } catch (e: any) {
    console.warn(
      e.message +
        `\n
      Check that all required environment variables are configured correctly (.env).\n
      Refer to README for more information`
    );
    return undefined;
  }
};
// Parse client settings object and return parsed results.
// If parsing fails for a field of the object, omit the field from the result object.
const parseSettings = (clientSettings: { [key: string]: string }) => {
  const { CLIENT__DOJO_LOG_API_URL } = clientSettings;
  const CLIENT__IS_ANALYST_WORKFLOW_VISIBLE = parseBoolean(
    clientSettings.CLIENT__IS_ANALYST_WORKFLOW_VISIBLE
  );
  const CLIENT__HIDE_SEARCH_KNOWLEDGE_BASE = parseBoolean(
    clientSettings.CLIENT__HIDE_SEARCH_KNOWLEDGE_BASE
  );
  const CLIENT__HIDE_ADD_DOCUMENT_BUTTON = parseBoolean(
    clientSettings.CLIENT__HIDE_ADD_DOCUMENT_BUTTON
  );
  const result: Partial<ApplicationConfiguration> = {
    CLIENT__DOJO_LOG_API_URL,
    CLIENT__IS_ANALYST_WORKFLOW_VISIBLE,
    CLIENT__HIDE_SEARCH_KNOWLEDGE_BASE,
    CLIENT__HIDE_ADD_DOCUMENT_BUTTON,
  };
  // Filter out undefined and return
  return _.omit(result, 'undefined');
};

const getConfiguration = async (): Promise<ApplicationConfiguration> => {
  const { data } = await API.get('client-settings', {});
  const settings = parseSettings(data as { [key: string]: string });
  const config = { ...DEFAULT_APPLICATION_CONFIGURATION, ...settings };
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
        await new Promise((resolve) => setTimeout(resolve, delayInMilliseconds));
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
