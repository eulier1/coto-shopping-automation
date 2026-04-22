import Table from 'cli-table3';
import chalk from 'chalk';
import { formatARS } from '../utils/pricing.js';

/**
 * Search results table.
 * @param {Array<{name, brand, price, unit, available}>} products
 */
export function renderSearchResults(products) {
  const table = new Table({
    head: ['#', 'Producto', 'Marca', 'Precio', 'Disponible'].map(h => chalk.cyan.bold(h)),
    colWidths: [4, 36, 18, 14, 12],
    wordWrap: true,
  });

  for (const [i, p] of products.entries()) {
    table.push([
      i + 1,
      p.name,
      p.brand || '-',
      chalk.green(formatARS(p.price)),
      p.available ? chalk.green('Sí') : chalk.red('No'),
    ]);
  }

  console.log(table.toString());
}

/**
 * Cart summary table.
 * @param {Array<{name, qty, unitPrice, total}>} items
 * @param {number} grandTotal
 */
export function renderCartTable(items, grandTotal) {
  const table = new Table({
    head: ['Producto', 'Cant.', 'Precio Unit.', 'Total'].map(h => chalk.cyan.bold(h)),
    colWidths: [36, 7, 14, 14],
    wordWrap: true,
  });

  for (const item of items) {
    table.push([
      item.name,
      item.qty,
      chalk.green(formatARS(item.unitPrice)),
      chalk.green(formatARS(item.total)),
    ]);
  }

  // Grand total row
  table.push([
    { content: chalk.bold('TOTAL'), colSpan: 3, hAlign: 'right' },
    chalk.green.bold(formatARS(grandTotal)),
  ]);

  console.log(table.toString());
}

/**
 * Delivery options table.
 * @param {Array<{date, day, slots: Array<{time, discount}>}>} options
 */
export function renderDeliveryOptions(options) {
  const table = new Table({
    head: ['#', 'Fecha', 'Día', 'Horario', 'Descuento'].map(h => chalk.cyan.bold(h)),
    colWidths: [4, 14, 14, 22, 14],
    wordWrap: true,
  });

  let idx = 1;
  for (const opt of options) {
    for (const slot of opt.slots) {
      table.push([
        idx++,
        opt.date,
        opt.day,
        slot.time,
        slot.discount ? chalk.yellow(slot.discount) : '-',
      ]);
    }
  }

  console.log(table.toString());
}

/**
 * Cards table.
 * @param {Array<{brand, number, expiry}>} cards
 */
export function renderCardsTable(cards) {
  const table = new Table({
    head: ['#', 'Marca', 'Número', 'Vencimiento'].map(h => chalk.cyan.bold(h)),
    colWidths: [4, 18, 20, 14],
  });

  for (const [i, card] of cards.entries()) {
    table.push([i + 1, card.brand, card.number, card.expiry || '-']);
  }

  console.log(table.toString());
}

/**
 * Installments table.
 * @param {Array<{count, amount, total, interest}>} installments
 */
export function renderInstallmentsTable(installments) {
  const table = new Table({
    head: ['#', 'Cuotas', 'Monto/cuota', 'Total', 'Interés'].map(h => chalk.cyan.bold(h)),
    colWidths: [4, 8, 16, 16, 12],
  });

  for (const [i, inst] of installments.entries()) {
    table.push([
      i + 1,
      inst.count,
      chalk.green(formatARS(inst.amount)),
      chalk.green(formatARS(inst.total)),
      inst.interest === 0 ? chalk.green('Sin interés') : chalk.yellow(`${inst.interest}%`),
    ]);
  }

  console.log(table.toString());
}

/**
 * Full order summary table.
 * @param {object} order
 */
export function renderOrderSummary(order) {
  const table = new Table({
    style: { head: [], border: [] },
    colWidths: [30, 24],
  });

  const rows = [
    ['Subtotal', formatARS(order.subtotal)],
    ['Envío', formatARS(order.shipping ?? 0)],
  ];

  if (order.discount) {
    rows.push(['Descuento', chalk.green(`-${formatARS(order.discount)}`)]);
  }

  rows.push(
    ['─'.repeat(26), '─'.repeat(20)],
    [chalk.bold('TOTAL'), chalk.green.bold(formatARS(order.total))],
  );

  if (order.paymentInfo) {
    rows.push(['Medio de pago', order.paymentInfo]);
  }

  if (order.delivery) {
    rows.push(['Entrega', order.delivery]);
  }

  for (const [label, value] of rows) {
    table.push([chalk.bold(label), value]);
  }

  console.log(table.toString());
}
