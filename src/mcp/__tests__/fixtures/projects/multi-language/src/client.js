import { getConfig } from './config.js';

export function createClient() {
  const config = getConfig();
  return {
    baseUrl: config.apiUrl,
    timeout: config.timeout,
  };
}

export function fetchData(endpoint) {
  const client = createClient();
  return { url: `${client.baseUrl}/${endpoint}` };
}
