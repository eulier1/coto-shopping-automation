import { chromium } from 'playwright';
import { existsSync, rmSync } from 'fs';
import { resolve } from 'path';

const STATE_FILE = resolve(process.cwd(), 'playwright-state.json');

/**
 * Launches a headed Chromium browser configured for COTO Digital.
 * If playwright-state.json exists, loads saved session to skip login.
 *
 * @returns {{ browser: Browser, context: BrowserContext, page: Page }}
 */
export async function launchBrowser() {
  // Always start clean — delete any saved session before launching
  if (existsSync(STATE_FILE)) {
    rmSync(STATE_FILE);
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  });

  const contextOptions = {
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    viewport: { width: 1280, height: 900 },
  };

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  return { browser, context, page };
}

/**
 * Saves browser session state to playwright-state.json for future runs.
 */
export async function saveSession(context) {
  await context.storageState({ path: STATE_FILE });
}

/**
 * Gracefully closes the browser.
 */
export async function closeBrowser(browser) {
  try {
    await browser.close();
  } catch (_) {}
}
