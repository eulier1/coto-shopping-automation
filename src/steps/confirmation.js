import { CONFIRMATION } from '../browser/selectors.js';
import { CheckoutError } from '../utils/errors.js';
import { parseARSPrice } from '../utils/pricing.js';
import { renderOrderSummary } from '../ui/tables.js';
import { askCVV, askSelectIVA, askFinalConfirm } from '../ui/prompts.js';
import { print } from '../ui/output.js';
import ora from 'ora';

/**
 * Step 6 — CVV entry, IVA condition, order review, and final confirmation.
 *
 * @param {Page} page
 * @param {boolean} dryRun - if true, skip the final payment click
 */
export async function confirmOrder(page, dryRun = false) {
  print.step(6, 7, 'Confirmación del pedido');

  // ── CVV ──────────────────────────────────────────────────────────────────────
  await enterCVV(page);

  // ── IVA Condition ────────────────────────────────────────────────────────────
  await selectIVACondition(page);

  // ── Order summary ────────────────────────────────────────────────────────────
  const order = await scrapeOrderSummary(page);
  print.divider();
  print.info('Resumen del pedido:');
  renderOrderSummary(order);
  print.divider();

  // ── Final confirm ────────────────────────────────────────────────────────────
  const confirmed = await askFinalConfirm(order.total);
  if (!confirmed) {
    throw new CheckoutError('El usuario canceló el pago en la confirmación final.');
  }

  if (dryRun) {
    print.warn('--dry-run activo: NO se hará click en el botón de pago.');
    return;
  }

  // Click pay button
  const payBtn = await page.$(CONFIRMATION.PAY_BTN);
  if (!payBtn) {
    throw new CheckoutError('No se encontró el botón de pago. Verificá el selector CONFIRMATION.PAY_BTN.');
  }

  const spinner = ora('Procesando pago…').start();
  await payBtn.click();

  // Wait up to 60s for success or error
  try {
    await Promise.race([
      page.waitForSelector(CONFIRMATION.SUCCESS_ELEMENT, { timeout: 60_000 }),
      page.waitForSelector(CONFIRMATION.ERROR_ELEMENT, { timeout: 60_000 }),
    ]);
    spinner.succeed('Respuesta recibida del servidor');
  } catch {
    spinner.warn('Timeout esperando respuesta — verificá tu cuenta COTO.');
  }
}

async function enterCVV(page) {
  const cvvInput = await page.$(CONFIRMATION.CVV_INPUT).catch(() => null);

  if (!cvvInput) {
    print.warn('No se encontró el campo CVV en esta pantalla — puede estar en otra sección.');
    return;
  }

  const cvv = await askCVV();
  await page.fill(CONFIRMATION.CVV_INPUT, cvv);
  await new Promise(r => setTimeout(r, 300));
}

async function selectIVACondition(page) {
  const ivaSelect = await page.$(CONFIRMATION.IVA_SELECT).catch(() => null);

  if (!ivaSelect) {
    print.dim('No se encontró selector de condición IVA — continuando.');
    return;
  }

  // Scrape available options
  const conditions = await page.$$eval(
    `${CONFIRMATION.IVA_SELECT} ${CONFIRMATION.IVA_OPTION}`,
    options => options.map(o => o.innerText.trim()).filter(Boolean),
  ).catch(() => ['Consumidor Final', 'Responsable Inscripto', 'Monotributista', 'Exento', 'No Responsable']);

  const selected = await askSelectIVA(conditions);

  // Select in browser — try label, then value string, then warn
  await page.selectOption(CONFIRMATION.IVA_SELECT, { label: selected })
    .catch(() => page.selectOption(CONFIRMATION.IVA_SELECT, selected))
    .catch(() => { print.warn('No se pudo seleccionar condición IVA.'); });

  await new Promise(r => setTimeout(r, 300));
}

async function scrapeOrderSummary(page) {
  const defaults = { subtotal: 0, shipping: 0, discount: 0, total: 0, paymentInfo: null, delivery: null };

  try {
    await page.waitForSelector(CONFIRMATION.ORDER_SUMMARY, { timeout: 10_000 });
    const summaryEl = await page.$(CONFIRMATION.ORDER_SUMMARY);
    if (!summaryEl) return defaults;

    const text = await summaryEl.innerText();

    // Try to extract values from text using simple regex patterns
    const totalMatch = text.match(/total[:\s]+\$?([\d.,]+)/i);
    const subtotalMatch = text.match(/subtotal[:\s]+\$?([\d.,]+)/i);
    const shippingMatch = text.match(/env[íi]o[:\s]+\$?([\d.,]+)/i);
    const discountMatch = text.match(/descuento[:\s]+\$?([\d.,]+)/i);

    return {
      subtotal: subtotalMatch ? parseARSPrice(subtotalMatch[1]) : 0,
      shipping: shippingMatch ? parseARSPrice(shippingMatch[1]) : 0,
      discount: discountMatch ? parseARSPrice(discountMatch[1]) : 0,
      total: totalMatch ? parseARSPrice(totalMatch[1]) : 0,
      paymentInfo: null,
      delivery: null,
    };
  } catch {
    return defaults;
  }
}
