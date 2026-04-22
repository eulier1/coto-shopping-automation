/**
 * COTO Digital Weekly Grocery CLI
 *
 * Orchestrates the full purchase flow:
 *   1. Login
 *   2. Search & add products
 *   3. Cart review
 *   4. Delivery selection
 *   5. Payment method
 *   6. Order confirmation
 *   7. Result display
 *
 * Usage:
 *   npm start               — Full flow
 *   npm start -- --dry-run  — Stop before clicking "Pay"
 *   PWDEBUG=1 npm start     — Open Playwright Inspector
 */

import { loadEnv, getCredentials, loadProducts, isDryRun } from './utils/config.js';
import { launchBrowser, closeBrowser } from './browser/launcher.js';
import { handleFatalError } from './utils/errors.js';
import { print } from './ui/output.js';

import { login } from './steps/login.js';
import { searchAndAddProducts } from './steps/search.js';
import { reviewCart } from './steps/cart.js';
import { selectDelivery } from './steps/delivery.js';
import { selectPaymentMethod } from './steps/payment.js';
import { confirmOrder } from './steps/confirmation.js';
import { showResult } from './steps/result.js';

async function main() {
  // ── Load configuration ──────────────────────────────────────────────────────
  loadEnv();
  const credentials = getCredentials();
  const products = loadProducts();
  const dryRun = isDryRun();

  print.header('COTO Digital — Compra Semanal Automática');
  if (dryRun) {
    print.warn('Modo DRY-RUN activo — no se realizará el pago final.');
  }
  print.info(`${products.length} producto(s) cargados desde products.json`);
  print.divider();

  // ── Launch browser ──────────────────────────────────────────────────────────
  let browser, context, page;
  try {
    ({ browser, context, page } = await launchBrowser());
  } catch (err) {
    print.error('No se pudo iniciar el navegador: ' + err.message);
    print.info('Asegurate de tener Playwright instalado: npx playwright install chromium');
    process.exit(1);
  }

  try {
    // Step 1 — Login
    await login(page, context, credentials);

    // Clear previous cart contents before starting a fresh run
    await clearCartIfNeeded(page);

    // Step 2 — Search & add products
    await searchAndAddProducts(page, products);

    // Step 3 — Cart review
    await reviewCart(page, products);

    // Step 4 — Delivery selection
    await selectDelivery(page);

    // Step 5 — Payment method
    await selectPaymentMethod(page);

    // Step 6 — Confirmation
    await confirmOrder(page, dryRun);

    // Step 7 — Result
    if (!dryRun) {
      await showResult(page);
    }

  } catch (err) {
    // Classified fatal errors close browser immediately
    const isFatal = ['ConfigError', 'LoginError', 'NetworkError'].includes(err.name);

    if (isFatal) {
      await handleFatalError(err, browser);
      return; // unreachable — process.exit() called inside
    }

    // User cancellations and checkout errors — print and exit cleanly
    if (err.name === 'CheckoutError') {
      print.warn(err.message);
      print.info('Proceso cancelado. Tu carrito puede tener productos guardados en COTO.');
    } else {
      print.error(`Error inesperado [${err.name}]: ${err.message}`);
      if (process.env.DEBUG) console.error(err.stack);
    }
  } finally {
    // Give browser a moment before closing so user can see the last screen
    await new Promise(r => setTimeout(r, 3000));
    await closeBrowser(browser);
  }
}

/**
 * Opens the header mini-cart and clicks "Vaciar carrito" if items are present.
 * The cart badge button's accessible name is its item count (e.g. "06").
 */
async function clearCartIfNeeded(page) {
  // #dropdownMenuButton2 is the cart toggle (always in DOM).
  // When items are present, its accessible name changes to the item count (e.g. "01", "09").
  // .and() intersects both selectors: only matches when the element is BOTH the cart button
  // AND has a numeric accessible name — i.e. only when the cart has items.
  const cartToggle    = page.locator('#dropdownMenuButton2');
  const cartWithItems = cartToggle.and(page.getByRole('button', { name: /^\d+$/ }));
  const hasItems      = await cartWithItems.isVisible().catch(() => false);

  if (!hasItems) {
    print.info('Carrito vacío — sin productos previos.');
    return;
  }

  print.info('Carrito con productos previos detectado — vaciando…');
  await cartToggle.click();

  const vaciarBtn = page.getByRole('button', { name: /Vaciar carrito/i });
  await vaciarBtn.waitFor({ state: 'visible', timeout: 8_000 });
  await vaciarBtn.click();

  // Confirm the "¿Desea vaciar su carrito?" modal
  const confirmarBtn = page.getByRole('button', { name: 'Si, vaciar' });
  await confirmarBtn.waitFor({ state: 'visible', timeout: 8_000 });
  await confirmarBtn.click();

  // Wait for numeric name to disappear from the cart button (cart is now empty)
  await cartWithItems.waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => {});
  print.success('Carrito vaciado.');
}

main();
