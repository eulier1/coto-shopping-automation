/**
 * CSS selectors for COTO Digital (www.cotodigital.com.ar)
 *
 * Oracle ATG + Angular SPA.
 *
 * CONFIRMED selectors (from live inspection):
 *   - Login form selectors
 *
 * ALL OTHER selectors are ESTIMATES based on ATG/Angular conventions.
 * Verify each with: PWDEBUG=1 node src/index.js
 */

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export const LOGIN = {
  // Wait anchor — the email/user input is always present when the form is ready
  EMAIL:        'input[formcontrolname="login"], input[formcontrolname="usuario"], input[placeholder*="29876564"]',
  PASSWORD:     'input[formcontrolname="password"], input[type="password"]',
  SUBMIT:       '#button_ingresar_login, button:has-text("Ingresar")',
  // Modal that appears when not logged in — must click Aceptar first
  MODAL:        '#modal-usuario-deslogueado',
  MODAL_ACCEPT: '#modal-usuario-deslogueado button:has-text("Aceptar"), #modal-usuario-deslogueado .btn-primary',
};

// ─── SEARCH ───────────────────────────────────────────────────────────────────
export const SEARCH = {
  // Search box in the persistent site header
  INPUT:            'input[placeholder*="comprar"], input[placeholder*="buscar"], input[type="search"]',

  // Signal that search results have loaded — the Angular add-to-cart component
  // is rendered inside every product card in the results list
  RESULTS_READY:    'product-add-show-remove',

  // Product name inside a result card (tried relative to the card ancestor)
  PRODUCT_NAME:     '[class*="descripcion"], [class*="description"], [class*="nombre"], [class*="title"]',

  // Quantity component — the Angular element wrapping add/qty controls
  QTY_COMPONENT:    'product-add-show-remove',
  // Current quantity input inside the component
  QTY_INPUT:        'input',

  // "Agregar" text button — only present before the product is added to cart
  ADD_BTN: 'button:has-text("Agregar")',

  // Icon-only qty buttons — appear AFTER clicking Agregar (component transforms).
  // Matched via getByRole in search.js (no text to target with CSS):
  //   "−" decrease: component.getByRole('button').filter({ hasText: /^$/ }).first()  [page nth(3)]
  //   "+" increase: component.getByRole('button').filter({ hasText: /^$/ }).nth(1)   [page nth(4)]
};

// ─── CART ─────────────────────────────────────────────────────────────────────
export const CART = {
  // Header mini-cart toggle — accessible name is the item count (e.g. "06").
  // Matched via: page.getByRole('button', { name: /^\d+$/ }).last()
  // "Vaciar carrito" inside the mini-cart dropdown:
  // Matched via: page.getByRole('button', { name: /Vaciar carrito/i })

  // Table/list of cart items
  ITEMS_CONTAINER:   '[class*="carrito"], [class*="cart-item"], [class*="listado"]',
  ITEM_ROW:          '[class*="item-producto"], [class*="cartItem"], [class*="cart-row"]',
  ITEM_NAME:         '[class*="descripcion"], [class*="nombre"]',
  ITEM_QTY:          '[class*="cantidad"], [class*="qty"]',
  ITEM_UNIT_PRICE:   '[class*="precio"], [class*="price"]',
  ITEM_TOTAL:        '[class*="subtotal"], [class*="total-item"]',
  GRAND_TOTAL:       '[class*="total-general"], [class*="grandTotal"], [class*="totalPedido"]',
  // Confirmed via live DOM inspection — matched with getByRole in cart.js
  CHECKOUT_BTN_NAME: 'Continuar compra',
  EMPTY_CART_MSG:    '[class*="carrito-vacio"], [class*="emptyCart"]',
};

// ─── DELIVERY ─────────────────────────────────────────────────────────────────
export const DELIVERY = {
  // Delivery date options container
  DATES_CONTAINER:   '[class*="fechas"], [class*="delivery-date"], [class*="entrega"]',
  DATE_OPTION:       '[class*="fecha-option"], [class*="dateOption"]',
  DATE_LABEL:        '[class*="fecha"], [class*="date"]',
  // Time slot list within a date
  SLOTS_CONTAINER:   '[class*="horarios"], [class*="slots"], [class*="franjas"]',
  SLOT_OPTION:       '[class*="horario"], [class*="slot"], [class*="franja"]',
  SLOT_LABEL:        '[class*="hora"], [class*="time"]',
  SLOT_DISCOUNT:     '[class*="descuento"], [class*="discount"]',
  CONTINUE_BTN:      'button:has-text("Continuar"), button:has-text("Siguiente"), [class*="continuar"]',
};

// ─── PAYMENT ──────────────────────────────────────────────────────────────────
export const PAYMENT = {
  // Card selection
  CARDS_CONTAINER:   '[class*="tarjetas"], [class*="cards"], [class*="medios-pago"]',
  CARD_OPTION:       '[class*="tarjeta"], [class*="card-option"]',
  CARD_BRAND:        '[class*="marca"], [class*="brand"]',
  CARD_NUMBER:       '[class*="numero"], [class*="number"], [class*="last4"]',
  CARD_EXPIRY:       '[class*="vencimiento"], [class*="expiry"]',
  // Installments
  INSTALLMENTS_CONTAINER: '[class*="cuotas"], [class*="installments"]',
  INSTALLMENT_OPTION:     '[class*="cuota"], [class*="installment-option"]',
  INSTALLMENT_COUNT:      '[class*="cantidad-cuotas"], [class*="count"]',
  INSTALLMENT_AMOUNT:     '[class*="monto-cuota"], [class*="amount"]',
  INSTALLMENT_TOTAL:      '[class*="total-cuotas"], [class*="total"]',
  INSTALLMENT_INTEREST:   '[class*="interes"], [class*="interest"]',
  CONTINUE_BTN:           'button:has-text("Continuar"), button:has-text("Siguiente"), [class*="continuar"]',
};

// ─── CONFIRMATION ─────────────────────────────────────────────────────────────
export const CONFIRMATION = {
  CVV_INPUT:         'input[name="cvv"], input[placeholder*="CVV"], input[placeholder*="cod"], input[type="password"][maxlength="4"], input[type="password"][maxlength="3"]',
  IVA_SELECT:        'select[name*="iva"], select[class*="condicion"], [class*="iva-condition"]',
  IVA_OPTION:        'option',
  ORDER_SUMMARY:     '[class*="resumen"], [class*="order-summary"], [class*="detalle-compra"]',
  PAY_BTN:           'button:has-text("Pagar"), button:has-text("Confirmar pago"), button:has-text("Confirmar"), [class*="pagar"]',
  SUCCESS_ELEMENT:   '[class*="confirmacion"], [class*="orden-exitosa"], [class*="order-success"], [class*="numero-orden"]',
  ERROR_ELEMENT:     '[class*="error-pago"], [class*="payment-error"], [class*="error-compra"]',
  ORDER_ID:          '[class*="numero-orden"], [class*="orderId"], [class*="order-number"]',
};

// ─── URLS ─────────────────────────────────────────────────────────────────────
export const URLS = {
  BASE:     'https://www.cotodigital.com.ar',
  LOGIN:    'https://www.cotodigital.com.ar/sitios/cdigi/ingresar',
  HOME:     'https://www.cotodigital.com.ar/sitios/cdigi/nuevositio',
  CART:     'https://www.cotodigital.com.ar/sitios/cdigi/carrito',
  SEARCH:   (term) => `https://www.cotodigital.com.ar/sitios/cdigi/busqueda?query=${encodeURIComponent(term)}`,
};
