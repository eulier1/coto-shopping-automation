import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';
import { ConfigError } from './errors.js';

dotenv.config();

export function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    throw new ConfigError('.env file not found. Copy .env.example to .env and fill in your credentials.');
  }
  // dotenv.config() already loaded it at module init — nothing else needed.
}

export function getCredentials() {
  const email = process.env.COTO_EMAIL;
  const password = process.env.COTO_PASSWORD;

  if (!email || email === 'your.email@example.com') {
    throw new ConfigError('COTO_EMAIL is not set in .env');
  }
  if (!password || password === 'yourpassword') {
    throw new ConfigError('COTO_PASSWORD is not set in .env');
  }
  return { email, password };
}

export function loadProducts() {
  const filePath = resolve(process.cwd(), process.env.PRODUCTS_FILE || './products.json');

  if (!existsSync(filePath)) {
    throw new ConfigError(`products.json not found at: ${filePath}`);
  }

  let data;
  try {
    data = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new ConfigError(`Failed to parse products.json: ${err.message}`);
  }

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    throw new ConfigError('products.json must have a non-empty "items" array');
  }

  for (const [i, item] of data.items.entries()) {
    if (!item.name || typeof item.name !== 'string') {
      throw new ConfigError(`products.json item[${i}] is missing a "name" string`);
    }
    if (item.defaultQty !== undefined && (typeof item.defaultQty !== 'number' || item.defaultQty < 1)) {
      throw new ConfigError(`products.json item[${i}] "defaultQty" must be a positive number`);
    }
  }

  return data.items.map(item => ({
    name:        item.name.trim(),
    defaultQty:  item.defaultQty ?? 1,
    notes:       item.notes ?? null,
    searchQuery: item.searchQuery ?? null,
    mustExclude: item.mustExclude ?? [],
  }));
}

export function isDryRun() {
  return process.argv.includes('--dry-run');
}
