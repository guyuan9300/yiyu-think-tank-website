import { appConfig } from './config';
import { httpRequest } from './httpClient';

export async function checkServiceHealth() {
  const resp = await httpRequest(appConfig.healthEndpoint, { method: 'GET' }, 5000);
  if (!resp.ok) {
    throw new Error(`health check failed: ${resp.status}`);
  }
  return true;
}
