import { parseArgs } from 'node:util';
import { readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { select } from '@inquirer/prompts';
import { ConfigError } from './errors.js';

async function resolveProductsFile(fileArg) {
  if (fileArg) return resolve(process.cwd(), fileArg);

  const dir = resolve(process.cwd(), 'products');
  let files;
  try {
    files = readdirSync(dir).filter(f => f.endsWith('.json'));
  } catch {
    throw new ConfigError('products/ directory not found. Use --file=<path> to specify a list.');
  }

  if (files.length === 0)
    throw new ConfigError('No JSON files found in products/. Add at least one.');

  if (files.length === 1)
    return resolve(dir, files[0]);

  if (!process.stdout.isTTY)
    throw new ConfigError(
      `Multiple product files found — specify one with --file=products/<name>.json\nAvailable: ${files.join(', ')}`
    );

  return select({
    message: 'Select a product list:',
    choices: files.map(f => ({ name: basename(f, '.json'), value: resolve(dir, f) })),
  });
}

export async function getArgs() {
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        file:      { type: 'string',  short: 'f' },
        'dry-run': { type: 'boolean', default: false },
      },
      strict: true,
    }));
  } catch (err) {
    throw new ConfigError(err.message);
  }

  const file = await resolveProductsFile(values.file ?? null);
  return { file, dryRun: values['dry-run'] };
}
