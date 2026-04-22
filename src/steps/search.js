import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { SEARCH, URLS } from '../browser/selectors.js';
import { SearchError } from '../utils/errors.js';
import { print } from '../ui/output.js';
import ora from 'ora';

const LOG_PATH = resolve(process.cwd(), 'productsNotFound.log');

/**
 * Step 2 — For each product: search via the header box, check the first result,
 * click Agregar if it matches, then set quantity using the +/- controls inside
 * the <product-add-show-remove> Angular component.
 *
 * @param {Page} page
 * @param {Array<{name, defaultQty, notes}>} products
 */
export async function searchAndAddProducts(page, products) {
  print.step(2, 7, `Búsqueda y agregado de productos (${products.length} items)`);

  const notFound = [];

  for (const [idx, product] of products.entries()) {
    print.divider();
    print.info(`[${idx + 1}/${products.length}] Buscando: ${product.name}`);
    if (product.notes) print.dim(`  Nota: ${product.notes}`);

    try {
      const result = await searchSingleProduct(page, product);
      if (!result.found) {
        print.error(`"${product.name}" no existe en el catálogo de COTO — se omite.`);
        notFound.push({ name: product.name, foundInstead: result.foundName });
      }
    } catch (err) {
      if (err instanceof SearchError) {
        print.warn(err.message + ' — saltando producto.');
      } else {
        throw err;
      }
    }
  }

  if (notFound.length > 0) {
    _writeNotFoundLog(notFound);
  }
}

function _writeNotFoundLog(entries) {
  const timestamp = new Date().toISOString();
  const lines     = entries.map(e =>
    `- ${e.name}${e.foundInstead ? ` (primer resultado: "${e.foundInstead}")` : ''}`
  );
  const content = `Run: ${timestamp}\n\n${lines.join('\n')}\n`;

  writeFileSync(LOG_PATH, content, 'utf8');
  print.warn(`${entries.length} producto(s) no encontrado(s). Log guardado en: productsNotFound.log`);
}

async function searchSingleProduct(page, product) {
  const spinner = ora(`Buscando "${product.name}"…`).start();

  // ── 1. Type into the header search box and submit ──────────────────────────
  try {
    if (!page.url().includes('cotodigital.com.ar')) {
      await page.goto(URLS.HOME, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    }

    const searchInput = page.locator(SEARCH.INPUT).first();
    await searchInput.waitFor({ state: 'visible', timeout: 15_000 });
    await searchInput.click({ clickCount: 3 }); // select-all to clear previous term
    await searchInput.fill(product.searchQuery ?? product.name);
    await searchInput.press('Enter');
  } catch (err) {
    spinner.fail();
    throw new SearchError(`No se pudo ejecutar la búsqueda: ${err.message}`);
  }

  // ── 2. Wait until product-add-show-remove components are rendered ──────────
  // This Angular component appears inside every product card once results load.
  spinner.text = 'Esperando resultados…';
  try {
    await page.waitForSelector(SEARCH.RESULTS_READY, { timeout: 25_000 });
  } catch {
    const shotPath = `debug-search-${product.name.replace(/\s+/g, '_').slice(0, 20)}.png`;
    await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
    spinner.fail(`Sin resultados visibles para "${product.name}"`);
    throw new SearchError(`No se cargaron resultados para "${product.name}"`);
  }

  // Small extra wait for Angular to finish rendering all cards
  await new Promise(r => setTimeout(r, 800));

  // ── 3. Read first result name and check for a case-insensitive match ───────
  spinner.text = 'Verificando primer resultado…';

  const firstQtyComponent = page.locator(SEARCH.QTY_COMPONENT).first();
  const firstCardHandle   = await firstQtyComponent.elementHandle();

  // Walk up the DOM (up to 6 levels) to find a parent that has a product-name element
  const firstCardName = await page.evaluate(({ el, nameSelector }) => {
    let node = el;
    for (let i = 0; i < 6; i++) {
      node = node.parentElement;
      if (!node) break;
      const nameEl = node.querySelector(nameSelector);
      if (nameEl) {
        const text = nameEl.innerText.trim();
        if (text.length > 2) return text;
      }
    }
    // Last resort: return all non-empty text of the first card ancestor
    return node ? node.innerText.split('\n').find(t => t.trim().length > 4) || '' : '';
  }, { el: firstCardHandle, nameSelector: SEARCH.PRODUCT_NAME });

  // Case-insensitive: every word in the search term must appear in the result name
  const searchWords  = product.name.trim().toLowerCase().split(/\s+/);
  const resultLower  = firstCardName.toLowerCase();
  const isMatch      = searchWords.every(w => resultLower.includes(w));

  const isExcluded = product.mustExclude.some(word =>
    resultLower.includes(word.toLowerCase())
  );

  if (!isMatch || isExcluded) {
    spinner.stop();
    return { found: false, foundName: firstCardName || null };
  }

  // ── 4. Click Agregar on the first result ───────────────────────────────────
  spinner.text = `Agregando "${firstCardName}"…`;

  await firstQtyComponent.scrollIntoViewIfNeeded();

  // "Agregar" text button — present only before the product is in the cart
  const addBtn = firstQtyComponent.locator(SEARCH.ADD_BTN).first();
  await addBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await addBtn.click();

  // ── 5. Wait for quantity controls to appear inside product-add-show-remove ─
  // After clicking Agregar the component re-renders with input + +/- buttons.
  try {
    await firstQtyComponent.locator(SEARCH.QTY_INPUT).waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    spinner.warn(`"${firstCardName}" agregado, pero no aparecieron controles de cantidad.`);
    print.success(`"${firstCardName}" × 1 agregado al carrito`);
    return { found: true };
  }

  // ── 6. Adjust quantity with the + button (product add button quantity) ─────
  const targetQty = product.defaultQty ?? 1;

  if (targetQty > 1) {
    // icon-only "+" button — second empty-text button inside the component
    const addQtyBtn = firstQtyComponent.getByRole('button').filter({ hasText: /^$/ }).nth(1);

    for (let i = 1; i < targetQty; i++) {
      await addQtyBtn.click();
      await new Promise(r => setTimeout(r, 350));
    }
  }

  // Read back the quantity the site confirmed
  const finalQty = await firstQtyComponent.locator(SEARCH.QTY_INPUT).first()
    .inputValue()
    .catch(() => String(targetQty));

  spinner.succeed(`"${firstCardName}" × ${finalQty} agregado al carrito`);
  print.success(`"${firstCardName}" × ${finalQty} agregado al carrito`);
  return { found: true };
}
