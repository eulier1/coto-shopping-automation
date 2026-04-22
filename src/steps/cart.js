import { CART, URLS } from '../browser/selectors.js';
import { CartError, CheckoutError, NetworkError } from '../utils/errors.js';
import { appendPurchaseLog } from '../utils/purchaseLog.js';
import { parseARSPrice } from '../utils/pricing.js';
import { renderCartTable } from '../ui/tables.js';
import { askContinueToCart } from '../ui/prompts.js';
import { print } from '../ui/output.js';
import ora from 'ora';

/**
 * Step 3 — Navigate to cart, show summary, ask user to proceed to checkout.
 *
 * @param {Page} page
 * @param {Array} products — output of loadProducts()
 * @returns {void}
 */
export async function reviewCart(page, products) {
  print.step(3, 7, 'Revisión del carrito');

  const spinner = ora('Cargando carrito…').start();

  try {
    await page.goto(URLS.CART, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  } catch (err) {
    spinner.fail('No se pudo cargar el carrito');
    throw new NetworkError(err.message);
  }

  // Check for empty cart
  const emptyMsg = await page.$(CART.EMPTY_CART_MSG).catch(() => null);
  if (emptyMsg) {
    spinner.fail('El carrito está vacío');
    throw new CartError('El carrito está vacío. No se agregó ningún producto.');
  }

  spinner.text = 'Leyendo productos del carrito…';

  const items = await scrapeCartItems(page);

  if (items.length === 0) {
    spinner.warn('No se pudieron leer los productos del carrito');
  } else {
    spinner.succeed(`${items.length} producto(s) en el carrito`);
  }

  // Compute grand total
  const grandTotal = await scrapeGrandTotal(page, items);

  // Render table
  renderCartTable(items, grandTotal);

  // Ask to continue
  const proceed = await askContinueToCart();
  if (!proceed) {
    throw new CheckoutError('El usuario canceló el checkout desde el carrito.');
  }

  // Click checkout button
  const checkoutBtn = page.getByRole('button', { name: CART.CHECKOUT_BTN_NAME });
  const checkoutVisible = await checkoutBtn.isVisible().catch(() => false);
  if (!checkoutVisible) {
    throw new CartError(`No se encontró el botón "${CART.CHECKOUT_BTN_NAME}". Verificá con PWDEBUG=1 npm start.`);
  }

  await checkoutBtn.click();
  appendPurchaseLog(products);

  // Wait for next screen to load
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  print.success('Checkout iniciado');
  print.info('Compra registrada en purchase-log.json');
}

async function scrapeCartItems(page) {
  const items = [];

  try {
    const rows = await page.$$(CART.ITEM_ROW);

    for (const row of rows) {
      try {
        const name = await row.$eval(CART.ITEM_NAME, el => el.innerText.trim()).catch(() => 'Producto');
        const qtyText = await row.$eval(CART.ITEM_QTY, el => el.innerText.trim()).catch(() => '1');
        const unitPriceText = await row.$eval(CART.ITEM_UNIT_PRICE, el => el.innerText.trim()).catch(() => '0');
        const totalText = await row.$eval(CART.ITEM_TOTAL, el => el.innerText.trim()).catch(() => '0');

        const qty = parseInt(qtyText, 10) || 1;
        const unitPrice = parseARSPrice(unitPriceText);
        const total = parseARSPrice(totalText) || unitPrice * qty;

        items.push({ name, qty, unitPrice, total });
      } catch {
        // Skip unparseable rows
      }
    }
  } catch {
    // Selector might be wrong — will be fixed after DOM inspection
  }

  return items;
}

async function scrapeGrandTotal(page, items) {
  try {
    const totalText = await page.$eval(CART.GRAND_TOTAL, el => el.innerText.trim());
    return parseARSPrice(totalText);
  } catch {
    // Fallback: sum item totals
    return items.reduce((sum, i) => sum + i.total, 0);
  }
}
