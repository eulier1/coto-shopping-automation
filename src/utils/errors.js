export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class LoginError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LoginError';
  }
}

export class SearchError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SearchError';
  }
}

export class CartError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CartError';
  }
}

export class CheckoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CheckoutError';
  }
}

export class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Retries fn() up to `retries` times with exponential backoff.
 * @param {Function} fn - async function to retry
 * @param {number} retries
 * @param {number} delayMs - base delay in ms (multiplied by attempt number)
 */
export async function withRetry(fn, retries = 3, delayMs = 1500) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

/**
 * Prints error and exits. Pass browser to close it first.
 */
export async function handleFatalError(err, browser) {
  console.error(`\n[FATAL] ${err.name || 'Error'}: ${err.message}`);
  if (err.stack && process.env.DEBUG) {
    console.error(err.stack);
  }
  if (browser) {
    try { await browser.close(); } catch (_) {}
  }
  process.exit(1);
}
