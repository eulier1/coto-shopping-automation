import { PAYMENT } from '../browser/selectors.js';
import { CheckoutError } from '../utils/errors.js';
import { parseARSPrice } from '../utils/pricing.js';
import { renderCardsTable, renderInstallmentsTable } from '../ui/tables.js';
import { askSelectCard, askContinueAfterCard, askSelectInstallment } from '../ui/prompts.js';
import { print } from '../ui/output.js';
import ora from 'ora';

/**
 * Step 5 — Select payment card and installment plan.
 *
 * @param {Page} page
 */
export async function selectPaymentMethod(page) {
  print.step(5, 7, 'Selección de medio de pago');

  // ── Card selection ──────────────────────────────────────────────────────────
  await selectCard(page);

  // ── Installments ────────────────────────────────────────────────────────────
  await selectInstallments(page);

  print.success('Medio de pago seleccionado');
}

async function selectCard(page) {
  const spinner = ora('Cargando tarjetas disponibles…').start();

  try {
    await page.waitForSelector(PAYMENT.CARDS_CONTAINER, { timeout: 20_000 });
    spinner.succeed('Tarjetas cargadas');
  } catch {
    spinner.fail('No se encontraron tarjetas');
    throw new CheckoutError('No se encontró la sección de selección de tarjetas. Verificá el selector PAYMENT.CARDS_CONTAINER.');
  }

  const cards = await scrapeCards(page);

  if (cards.length === 0) {
    throw new CheckoutError('No se encontraron tarjetas registradas en la cuenta.');
  }

  renderCardsTable(cards);

  const selectedCard = await askSelectCard(cards);

  // Click in browser
  try {
    await selectedCard.element.click();
    await new Promise(r => setTimeout(r, 800));
  } catch {
    print.warn('No se pudo hacer click en la tarjeta — puede haberse ya seleccionado.');
  }

  const proceed = await askContinueAfterCard();
  if (!proceed) {
    throw new CheckoutError('El usuario canceló la selección de tarjeta.');
  }

  // Click continue if present
  const continueBtn = page.locator(PAYMENT.CONTINUE_BTN).first();
  const continueBtnVisible = await continueBtn.isVisible().catch(() => false);
  if (continueBtnVisible) {
    await continueBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function selectInstallments(page) {
  const spinner = ora('Cargando planes de cuotas…').start();

  try {
    await page.waitForSelector(PAYMENT.INSTALLMENTS_CONTAINER, { timeout: 20_000 });
    spinner.succeed('Cuotas cargadas');
  } catch {
    spinner.warn('No se encontró la sección de cuotas — continuando sin selección de cuotas.');
    return;
  }

  const installments = await scrapeInstallments(page);

  if (installments.length === 0) {
    print.warn('No se encontraron opciones de cuotas.');
    return;
  }

  renderInstallmentsTable(installments);

  const selected = await askSelectInstallment(installments);

  try {
    await selected.element.click();
    await new Promise(r => setTimeout(r, 800));
  } catch {
    print.warn('No se pudo hacer click en las cuotas.');
  }

  // Continue button
  const continueBtn2 = page.locator(PAYMENT.CONTINUE_BTN).first();
  const continueBtn2Visible = await continueBtn2.isVisible().catch(() => false);
  if (continueBtn2Visible) {
    await continueBtn2.click();
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function scrapeCards(page) {
  const cards = [];
  try {
    const cardEls = await page.$$(PAYMENT.CARD_OPTION);
    for (const el of cardEls) {
      const brand = await el.$eval(PAYMENT.CARD_BRAND, e => e.innerText.trim()).catch(() => 'Tarjeta');
      const number = await el.$eval(PAYMENT.CARD_NUMBER, e => e.innerText.trim()).catch(() => '****');
      const expiry = await el.$eval(PAYMENT.CARD_EXPIRY, e => e.innerText.trim()).catch(() => null);
      cards.push({ brand, number, expiry, element: el });
    }
  } catch (err) {
    print.warn(`Error al leer tarjetas: ${err.message}`);
  }
  return cards;
}

async function scrapeInstallments(page) {
  const installments = [];
  try {
    const els = await page.$$(PAYMENT.INSTALLMENT_OPTION);
    for (const el of els) {
      const countText = await el.$eval(PAYMENT.INSTALLMENT_COUNT, e => e.innerText.trim()).catch(() => '1');
      const amountText = await el.$eval(PAYMENT.INSTALLMENT_AMOUNT, e => e.innerText.trim()).catch(() => '0');
      const totalText = await el.$eval(PAYMENT.INSTALLMENT_TOTAL, e => e.innerText.trim()).catch(() => '0');
      const interestText = await el.$eval(PAYMENT.INSTALLMENT_INTEREST, e => e.innerText.trim()).catch(() => '0');

      const count = parseInt(countText, 10) || 1;
      const amount = parseARSPrice(amountText);
      const total = parseARSPrice(totalText) || amount * count;
      const interest = parseFloat(interestText.replace('%', '')) || 0;

      installments.push({ count, amount, total, interest, element: el });
    }
  } catch (err) {
    print.warn(`Error al leer cuotas: ${err.message}`);
  }
  return installments;
}
