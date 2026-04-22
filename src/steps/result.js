import { CONFIRMATION } from '../browser/selectors.js';
import { print } from '../ui/output.js';

/**
 * Step 7 — Show success or error result after payment.
 *
 * @param {Page} page
 */
export async function showResult(page) {
  print.step(7, 7, 'Resultado del pedido');
  print.divider();

  // Check for success
  const successEl = await page.$(CONFIRMATION.SUCCESS_ELEMENT).catch(() => null);
  if (successEl) {
    const orderIdEl = await page.$(CONFIRMATION.ORDER_ID).catch(() => null);
    const orderId = orderIdEl ? await orderIdEl.innerText().then(t => t.trim()) : null;

    print.success('¡Pedido realizado con éxito!');
    if (orderId) {
      print.info(`Número de orden: ${orderId}`);
    }
    print.info('Revisá tu email para la confirmación del pedido.');
    print.divider();
    return;
  }

  // Check for error
  const errorEl = await page.$(CONFIRMATION.ERROR_ELEMENT).catch(() => null);
  if (errorEl) {
    const errorMsg = await errorEl.innerText().then(t => t.trim()).catch(() => 'Error desconocido');
    print.error(`El pago fue rechazado: ${errorMsg}`);
    print.warn('Verificá los datos de tu tarjeta e intentá nuevamente.');
    print.divider();
    return;
  }

  // Unknown state
  print.warn('No se pudo determinar el resultado del pago.');
  print.info('Por favor, verificá tu cuenta en cotodigital.com.ar para confirmar si el pedido fue procesado.');
  print.divider();
}
