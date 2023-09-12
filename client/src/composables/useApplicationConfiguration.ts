import API from '@/api/api';
import { ApplicationConfiguration } from '@/types/ApplicationConfiguration';
import { convertStringToBoolean } from '@/utils/string-util';
import { onMounted, ref } from 'vue';
import _ from 'lodash';

// If the attempt to fetch the application configuration fails, check again
//  after a progressively longer delay. No fetch is attempted after the last
//  delay.
const RETRY_DELAY_LENGTHS_IN_SECONDS = [1, 5, 10, 30, 60, 0];

const DEFAULT_APPLICATION_CONFIGURATION: ApplicationConfiguration = {
  CLIENT__IS_ANALYST_WORKFLOW_VISIBLE: true,
  CLIENT__USER_DOCS_URL: 'https://app.causemos.ai/docs/',
  CLIENT__DOJO_LOG_API_URL: 'https://phantom.dojo-test.com',
  CLIENT__DOJO_UPLOAD_DOCUMENT_URL: 'https://causemos-analyst.dojo-modeling.com/documents/upload',
  CLIENT__HIDE_ADD_DOCUMENT_BUTTON: true,
};

const parseBoolean = (val: string) => {
  try {
    return convertStringToBoolean(val);
  } catch (e: any) {
    console.warn(
      `${e.message}
      Check that all required environment variables are configured correctly (.env).
      Refer to README for more information.`
    );
    return undefined;
  }
};
// Parse client settings object and return parsed results.
// If parsing fails for a field of the object, omit the field from the result object.
const parseSettings = (clientSettings: { [key: string]: string }) => {
  const config = { ...DEFAULT_APPLICATION_CONFIGURATION };
  const { CLIENT__DOJO_LOG_API_URL, CLIENT__DOJO_UPLOAD_DOCUMENT_URL, CLIENT__USER_DOCS_URL } =
    clientSettings;
  if (CLIENT__DOJO_LOG_API_URL !== undefined) {
    config.CLIENT__DOJO_LOG_API_URL = CLIENT__DOJO_LOG_API_URL;
  }
  if (CLIENT__DOJO_UPLOAD_DOCUMENT_URL !== undefined) {
    config.CLIENT__DOJO_UPLOAD_DOCUMENT_URL = CLIENT__DOJO_UPLOAD_DOCUMENT_URL;
  }
  if (CLIENT__USER_DOCS_URL !== undefined) {
    config.CLIENT__USER_DOCS_URL = CLIENT__USER_DOCS_URL;
  }

  const CLIENT__IS_ANALYST_WORKFLOW_VISIBLE = parseBoolean(
    clientSettings.CLIENT__IS_ANALYST_WORKFLOW_VISIBLE
  );
  if (CLIENT__IS_ANALYST_WORKFLOW_VISIBLE !== undefined) {
    config.CLIENT__IS_ANALYST_WORKFLOW_VISIBLE = CLIENT__IS_ANALYST_WORKFLOW_VISIBLE;
  }

  const CLIENT__HIDE_ADD_DOCUMENT_BUTTON = parseBoolean(
    clientSettings.CLIENT__HIDE_ADD_DOCUMENT_BUTTON
  );
  if (CLIENT__HIDE_ADD_DOCUMENT_BUTTON !== undefined) {
    config.CLIENT__HIDE_ADD_DOCUMENT_BUTTON = CLIENT__HIDE_ADD_DOCUMENT_BUTTON;
  }

  return config;
};

const getConfiguration = async (): Promise<ApplicationConfiguration> => {
  const { data } = await API.get('client-settings', {});
  return parseSettings(data as { [key: string]: string });
};

const applicationConfiguration = ref(DEFAULT_APPLICATION_CONFIGURATION);

export default function useApplicationConfiguration() {
  const tryToFetchConfiguration = async () => {
    for (const delayInSeconds of RETRY_DELAY_LENGTHS_IN_SECONDS) {
      try {
        // Fetch configuration
        const configuration = await getConfiguration();
        // On success, save it to the store
        applicationConfiguration.value = configuration;
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

  return { applicationConfiguration };
}