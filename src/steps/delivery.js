import { DELIVERY } from '../browser/selectors.js';
import { CheckoutError } from '../utils/errors.js';
import { renderDeliveryOptions } from '../ui/tables.js';
import { askSelectDelivery, askContinueAfterDelivery } from '../ui/prompts.js';
import { print } from '../ui/output.js';
import ora from 'ora';

/**
 * Step 4 — Select delivery date and time slot.
 *
 * @param {Page} page
 */
export async function selectDelivery(page) {
  print.step(4, 7, 'Selección de fecha y horario de entrega');

  const spinner = ora('Cargando opciones de entrega…').start();

  // Wait for delivery screen to appear
  try {
    await page.waitForSelector(DELIVERY.DATES_CONTAINER, { timeout: 20_000 });
    spinner.succeed('Opciones de entrega cargadas');
  } catch {
    spinner.fail('No se encontraron opciones de entrega');
    throw new CheckoutError('No se encontró la pantalla de selección de entrega. Verificá el selector DELIVERY.DATES_CONTAINER.');
  }

  // Scrape available delivery options
  const options = await scrapeDeliveryOptions(page);

  if (options.length === 0) {
    print.warn('No se encontraron fechas de entrega disponibles.');
    throw new CheckoutError('No hay franjas horarias disponibles para entrega.');
  }

  // Render table
  renderDeliveryOptions(options);

  // Flatten for select prompt
  const flatSlots = [];
  for (const [dateIdx, opt] of options.entries()) {
    for (const [slotIdx, slot] of opt.slots.entries()) {
      const discount = slot.discount ? ` 🏷 ${slot.discount}` : '';
      flatSlots.push({
        label: `${opt.date} (${opt.day}) — ${slot.time}${discount}`,
        dateIndex: dateIdx,
        slotIndex: slotIdx,
      });
    }
  }

  const selected = await askSelectDelivery(flatSlots);

  // Click the selected option in browser
  await clickDeliveryOption(page, options, selected.dateIndex, selected.slotIndex);

  const proceed = await askContinueAfterDelivery();
  if (!proceed) {
    throw new CheckoutError('El usuario canceló la selección de entrega.');
  }

  // Click continue
  const continueBtn = page.locator(DELIVERY.CONTINUE_BTN).first();
  const continueBtnVisible = await continueBtn.isVisible().catch(() => false);
  if (continueBtnVisible) {
    await continueBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
  } else {
    print.warn('No se encontró el botón "Continuar" en entrega — continuando igualmente.');
  }

  print.success('Entrega seleccionada');
}

async function scrapeDeliveryOptions(page) {
  const options = [];

  try {
    const dateEls = await page.$$(DELIVERY.DATE_OPTION);

    for (const [dateIdx, dateEl] of dateEls.entries()) {
      if (dateIdx >= 10) break;

      const dateLabel = await dateEl.$eval(DELIVERY.DATE_LABEL, el => el.innerText.trim()).catch(() => `Fecha ${dateIdx + 1}`);
      const [date, day] = parseDateLabel(dateLabel);

      const slotsEl = await dateEl.$$(DELIVERY.SLOT_OPTION).catch(() => []);
      const slots = [];

      for (const slotEl of slotsEl) {
        const time = await slotEl.$eval(DELIVERY.SLOT_LABEL, el => el.innerText.trim()).catch(() => 'Horario');
        const discount = await slotEl.$eval(DELIVERY.SLOT_DISCOUNT, el => el.innerText.trim()).catch(() => null);
        slots.push({ time, discount, element: slotEl });
      }

      if (slots.length > 0) {
        options.push({ date, day, slots, element: dateEl });
      }
    }
  } catch (err) {
    print.warn(`Error al leer opciones de entrega: ${err.message}`);
  }

  return options;
}

function parseDateLabel(label) {
  // Try to split "Martes 04/03" → ["04/03", "Martes"]
  const parts = label.split(/\s+/);
  if (parts.length >= 2) {
    // Check if last part looks like a date
    if (/\d{2}\/\d{2}/.test(parts[parts.length - 1])) {
      return [parts[parts.length - 1], parts.slice(0, -1).join(' ')];
    }
    return [parts[0], parts.slice(1).join(' ')];
  }
  return [label, ''];
}

async function clickDeliveryOption(page, options, dateIndex, slotIndex) {
  try {
    const opt = options[dateIndex];
    if (!opt) return;
    const slot = opt.slots[slotIndex];
    if (!slot) return;
    await slot.element.click();
    await new Promise(r => setTimeout(r, 500));
  } catch (err) {
    print.warn(`No se pudo hacer click en la franja horaria: ${err.message}`);
  }
}
