import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const LOG_PATH = resolve(process.cwd(), 'purchase-log.json');

/**
 * Appends a timestamped purchase entry to purchase-log.json.
 *
 * Key:   ISO timestamp truncated to the hour — "2026-04-21T14:00"
 * Value: products array as loaded from products.json
 *
 * @param {Array} products — output of loadProducts()
 */
export function appendPurchaseLog(products) {
  const key = new Date().toISOString().slice(0, 16);

  const log = existsSync(LOG_PATH)
    ? JSON.parse(readFileSync(LOG_PATH, 'utf8'))
    : {};

  log[key] = products;

  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
}
