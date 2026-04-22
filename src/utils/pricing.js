/**
 * Argentine IVA rates:
 *   21%   — most products (default)
 *   10.5% — some basic foods (bread, milk, etc.)
 */

const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Returns the price before IVA.
 * @param {number} priceWithIVA
 * @param {number} ivaRate - e.g. 0.21 or 0.105
 */
export function calcPriceWithoutIVA(priceWithIVA, ivaRate = 0.21) {
  return Math.round((priceWithIVA / (1 + ivaRate)) * 100) / 100;
}

/**
 * Returns qty * unitPrice rounded to 2 decimals.
 */
export function calcTotal(unitPrice, quantity) {
  return Math.round(unitPrice * quantity * 100) / 100;
}

/**
 * Formats a number as Argentine pesos: "$1.250,50"
 */
export function formatARS(amount) {
  return arsFormatter.format(amount);
}

/**
 * Parses ARS price strings like "$1.250,50", "1250.50", "1.250,50"
 * Returns a float.
 */
export function parseARSPrice(priceString) {
  if (typeof priceString === 'number') return priceString;
  // Remove currency symbol and whitespace
  let s = String(priceString).replace(/\$/g, '').trim();
  // Handle Argentine format: dots as thousands sep, comma as decimal
  // e.g. "1.250,50" → 1250.50
  if (s.includes(',')) {
    // Argentine format: remove dots (thousands), replace comma with dot
    s = s.replace(/\./g, '').replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Returns a short human-readable IVA label.
 * @param {number} ivaRate - e.g. 0.21
 */
export function ivaLabel(ivaRate = 0.21) {
  return `${(ivaRate * 100).toFixed(1)}%`;
}
