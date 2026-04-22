import chalk from 'chalk';

const DIVIDER = '─'.repeat(60);

export const print = {
  header(msg) {
    console.log('\n' + chalk.bgRed.bold.white(` ${msg} `));
  },

  success(msg) {
    console.log(chalk.green(`✓ ${msg}`));
  },

  error(msg) {
    console.log(chalk.red(`✗ ${msg}`));
  },

  info(msg) {
    console.log(chalk.cyan(`ℹ ${msg}`));
  },

  warn(msg) {
    console.log(chalk.yellow(`⚠ ${msg}`));
  },

  dim(msg) {
    console.log(chalk.dim(msg));
  },

  /**
   * @param {string} label
   * @param {string} value - already formatted ARS string
   */
  price(label, value) {
    console.log(chalk.bold(label + ':') + ' ' + chalk.green(value));
  },

  divider() {
    console.log(chalk.dim(DIVIDER));
  },

  /**
   * Prints step indicator like [2/7] Searching: leche larga vida...
   */
  step(n, total, msg) {
    console.log('\n' + chalk.bgBlue.bold.white(` [${n}/${total}] `) + ' ' + chalk.bold(msg));
  },
};
