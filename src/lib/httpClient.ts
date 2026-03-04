import { appConfig } from './config';

export async function httpRequest(input: string, init: RequestInit = {}, timeoutMs = appConfig.requestTimeoutMs) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal || controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}
