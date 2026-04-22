import { select, input, confirm, password } from '@inquirer/prompts';
import chalk from 'chalk';
import { formatARS } from '../utils/pricing.js';

/**
 * Ask user to select a search result or skip.
 * @param {Array<{name, brand, price}>} results
 * @returns {object|null} chosen product, or null if skipped
 */
export async function askSelectProduct(results) {
  const choices = results.map((p, i) => ({
    name: `${i + 1}. ${p.name} ${p.brand ? `(${p.brand})` : ''} — ${formatARS(p.price)}`,
    value: p,
  }));

  choices.push({
    name: chalk.dim('— Saltear este producto —'),
    value: null,
  });

  return select({
    message: 'Seleccioná un producto:',
    choices,
    pageSize: 12,
  });
}

/**
 * Ask for quantity with defaultQty pre-filled.
 * @param {string} productName
 * @param {number} defaultQty
 * @returns {number}
 */
export async function askQuantity(productName, defaultQty = 1) {
  const answer = await input({
    message: `Cantidad para "${productName}":`,
    default: String(defaultQty),
    validate(val) {
      const n = parseInt(val, 10);
      if (isNaN(n) || n < 1) return 'Ingresá un número entero mayor a 0';
      if (n > 99) return 'La cantidad máxima es 99';
      return true;
    },
  });
  return parseInt(answer, 10);
}

/**
 * Confirm before adding product to cart.
 */
export async function askConfirmProduct(name, qty, total) {
  return confirm({
    message: `¿Agregar ${qty}x "${name}" al carrito? (Total: ${formatARS(total)})`,
    default: true,
  });
}

/**
 * Ask user if they want to proceed to checkout.
 */
export async function askContinueToCart() {
  return confirm({
    message: '¿Procedemos al checkout?',
    default: true,
  });
}

/**
 * Ask user to select a delivery slot from a flat list.
 * @param {Array<{label, dateIndex, slotIndex}>} options - flattened slot options
 * @returns {{ dateIndex, slotIndex }}
 */
export async function askSelectDelivery(options) {
  const choices = options.map(opt => ({
    name: opt.label,
    value: { dateIndex: opt.dateIndex, slotIndex: opt.slotIndex },
  }));

  return select({
    message: 'Seleccioná fecha y horario de entrega:',
    choices,
    pageSize: 12,
  });
}

/**
 * Confirm after delivery selection.
 */
export async function askContinueAfterDelivery() {
  return confirm({
    message: '¿Continuar con el pago?',
    default: true,
  });
}

/**
 * Ask user to select a card.
 * @param {Array<{brand, number, expiry}>} cards
 * @returns {object} chosen card
 */
export async function askSelectCard(cards) {
  const choices = cards.map((c, i) => ({
    name: `${i + 1}. ${c.brand} — ${c.number} ${c.expiry ? `(vence: ${c.expiry})` : ''}`,
    value: c,
  }));

  return select({
    message: 'Seleccioná la tarjeta:',
    choices,
    pageSize: 8,
  });
}

/**
 * Confirm after card selection.
 */
export async function askContinueAfterCard() {
  return confirm({
    message: '¿Continuar con esta tarjeta?',
    default: true,
  });
}

/**
 * Ask user to select an installment plan.
 * @param {Array<{count, amount, total, interest}>} installments
 * @returns {object} chosen installment
 */
export async function askSelectInstallment(installments) {
  const choices = installments.map((inst, i) => ({
    name: `${i + 1}. ${inst.count} cuota${inst.count > 1 ? 's' : ''} de ${formatARS(inst.amount)} ${inst.interest === 0 ? chalk.green('(sin interés)') : `(${inst.interest}%)`}`,
    value: inst,
  }));

  return select({
    message: 'Seleccioná el plan de cuotas:',
    choices,
    pageSize: 10,
  });
}

/**
 * Ask for CVV — input is masked.
 * @returns {string} CVV code
 */
export async function askCVV() {
  return password({
    message: 'Ingresá el CVV de tu tarjeta (oculto):',
    mask: '*',
    validate(val) {
      if (!/^\d{3,4}$/.test(val.trim())) return 'El CVV debe tener 3 o 4 dígitos numéricos';
      return true;
    },
  });
}

/**
 * Ask user to select IVA condition.
 * @param {string[]} conditions - list of condition strings scraped from page
 * @returns {string}
 */
export async function askSelectIVA(conditions) {
  const choices = conditions.map(c => ({ name: c, value: c }));
  return select({
    message: 'Seleccioná tu condición frente al IVA:',
    choices,
    default: conditions.find(c => /consumidor/i.test(c)) ?? conditions[0],
  });
}

/**
 * Final order confirm — defaults to No as a safety guard.
 * @param {number} totalAmount
 * @returns {boolean}
 */
export async function askFinalConfirm(totalAmount) {
  return confirm({
    message: chalk.red.bold(`¿CONFIRMAR PAGO por ${formatARS(totalAmount)}? (Esta acción es irreversible)`),
    default: false,
  });
}
