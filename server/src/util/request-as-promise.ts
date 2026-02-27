import axios from 'axios';
import Logger from '#@/config/logger.js';

export interface RequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  /** JSON request body (replaces the old 'json' option from the request library) */
  data?: unknown;
  /** Query string parameters (replaces the old 'qs' option) */
  params?: Record<string, any>;
  timeout?: number;
}

/**
 * Execute HTTP request using axios.
 * Returns the parsed response body (response.data).
 *
 * @param options - request options
 */
const requestAsPromise = async (options: RequestOptions): Promise<any> => {
  if (!options.url || !options.method) {
    throw new Error('Insufficient information to make request');
  }

  Logger.info('Making ' + options.method + ' request to ' + options.url);

  const response = await axios({
    method: options.method as any,
    url: options.url,
    headers: options.headers,
    data: options.data,
    params: options.params,
    timeout: options.timeout || 45000,
  });

  return response.data;
};

export default requestAsPromise;
