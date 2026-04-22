import { LOGIN, URLS } from '../browser/selectors.js';
import { saveSession } from '../browser/launcher.js';
import { LoginError, NetworkError } from '../utils/errors.js';
import { print } from '../ui/output.js';
import ora from 'ora';

/**
 * Step 1 — Log in to COTO Digital.
 *
 * First navigates to HOME so we can read the domain's localStorage.
 * If a session token is found there (and the site doesn't redirect to /ingresar),
 * we skip the form entirely and proceed.
 * Otherwise, navigates to /ingresar, fills credentials, and saves the session.
 *
 * @param {Page} page
 * @param {BrowserContext} context
 * @param {{ email: string, password: string }} credentials
 */
export async function login(page, context, credentials) {
  print.step(1, 7, 'Iniciando sesión en COTO Digital');

  const spinner = ora('Verificando sesión almacenada…').start();

  // Navigate to HOME so the browser is on the COTO domain and we can read localStorage
  try {
    await page.goto(URLS.HOME, { waitUntil: 'domcontentloaded', timeout: 4_000 });
  } catch (err) {
    spinner.fail('No se pudo cargar el sitio');
    throw new NetworkError(err.message);
  }

  // Check localStorage for any session/auth data stored by the site
  const hasStoredSession = await page.evaluate(() => {
    try {
      const keys = Object.keys(localStorage);
      return keys.some(k => /token|user|session|auth|customer|profile|login/i.test(k));
    } catch {
      return false;
    }
  });

  // If localStorage has session data AND the site didn't redirect us to /ingresar,
  // the session is valid — skip the login form
  if (hasStoredSession && !page.url().includes('/ingresar')) {
    spinner.succeed('Sesión activa encontrada en localStorage');
    return;
  }

  // ── No valid session — fill the login form ────────────────────────────────

  spinner.text = 'Navegando al formulario de login…';
  try {
    await page.goto(URLS.LOGIN, { waitUntil: 'domcontentloaded', timeout: 4_000 });
  } catch (err) {
    spinner.fail('No se pudo cargar la página de login');
    throw new NetworkError(err.message);
  }

  // Dismiss modal if present (#modal-usuario-deslogueado)
  try {
    const modal = page.locator(LOGIN.MODAL);
    const isVisible = await modal.isVisible({ timeout: 5_000 }).catch(() => false);
    if (isVisible) {
      spinner.text = 'Cerrando modal de aviso…';
      await page.locator(LOGIN.MODAL_ACCEPT).first().click({ timeout: 5_000 });
      await new Promise(r => setTimeout(r, 800));
    }
  } catch {
    // Modal not found or already gone — continue
  }

  // Wait for the email/user input — true "form ready" signal
  spinner.text = 'Esperando formulario de login…';
  try {
    await page.waitForSelector(LOGIN.EMAIL, { timeout: 4_000 });
  } catch {
    await page.screenshot({ path: 'debug-login.png', fullPage: true });
    spinner.fail('No se encontró el campo de usuario/email');
    throw new LoginError(
      'No se encontró el campo de usuario en la página de login. ' +
      'Revisá debug-login.png en la raíz del proyecto.',
    );
  }

  spinner.text = 'Completando credenciales…';
  await page.locator(LOGIN.EMAIL).first().fill(credentials.email);
  await page.locator(LOGIN.PASSWORD).first().fill(credentials.password);

  spinner.text = 'Enviando formulario…';
  await page.locator(LOGIN.SUBMIT).first().click();

  // Wait for navigation away from /ingresar
  try {
    await page.waitForLoadState('networkidle', { timeout: 4_000 });
  } catch {
    // SPA may not reach networkidle — fall through to URL check
  }

  await new Promise(r => setTimeout(r, 2000));

  // Verify we left the login page
  if (page.url().includes('/ingresar')) {
    const emailVisible = await page.locator(LOGIN.EMAIL).first().isVisible().catch(() => false);
    if (emailVisible) {
      await page.screenshot({ path: 'debug-login.png', fullPage: true });
      spinner.fail('Credenciales incorrectas o login fallido');
      throw new LoginError(
        'Las credenciales en .env son incorrectas, o el sitio bloqueó el acceso. ' +
        'Verificá COTO_EMAIL y COTO_PASSWORD. Revisá debug-login.png si la página cambió.',
      );
    }
  }

  // Save session (cookies + localStorage) so next run can skip the form
  try {
    await saveSession(context);
    spinner.succeed('Sesión iniciada y guardada para próximas ejecuciones');
  } catch (err) {
    spinner.warn('Login exitoso, pero no se pudo guardar la sesión: ' + err.message);
  }

  print.success('Login exitoso');
}
