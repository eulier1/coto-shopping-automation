import { parseArgs } from 'node:util';
import { ConfigError } from './errors.js';

export function getArgs() {
  try {
    const { values } = parseArgs({
      options: {
        file:      { type: 'string',  short: 'f' },
        'dry-run': { type: 'boolean', default: false },
      },
      strict: true,
    });
    return { file: values.file ?? null, dryRun: values['dry-run'] };
  } catch (err) {
    throw new ConfigError(err.message);
  }
}
