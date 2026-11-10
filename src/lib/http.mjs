const USER_AGENT = "Mozilla/5.0 (compatible; radar-vagas/2.0; +https://github.com/llorenzojorge/radar-vagas)";
const TIMEOUT_MS = 30_000;
const RETRIES = 1;

export class HttpError extends Error {
  constructor(status, url) {
    // Only the origin and path are logged; query strings may carry tokens.
    const { origin, pathname } = new URL(url);
    super(`HTTP ${status} em ${origin}${pathname}`);
    this.status = status;
  }
}

/**
 * GET with timeout and a single retry on network errors or 5xx responses.
 * @returns {Promise<string>}
 */
export async function fetchText(url, headers = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, ...headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.ok) return await response.text();
      if (response.status < 500 || attempt >= RETRIES) throw new HttpError(response.status, url);
    } catch (error) {
      if (error instanceof HttpError || attempt >= RETRIES) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000 * (attempt + 1)));
  }
}

export async function fetchJson(url, headers) {
  return JSON.parse(await fetchText(url, headers));
}
