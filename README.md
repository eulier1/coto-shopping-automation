# COTO Grocery Weekly Purchase Automation

A Node.js CLI that automates the full weekly grocery shopping flow on [COTO Digital](https://www.cotodigital.com.ar), an Argentine supermarket chain. It drives a visible Playwright browser while presenting an interactive terminal UI at each checkout step.

---

## Requirements

- Node.js >= 20.0.0
- Chromium (installed via Playwright)

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Chromium
npx playwright install chromium

# 3. Configure credentials
cp .env.example .env
# Edit .env with your COTO Digital email and password

# 4. Configure your shopping list
# Edit products.json (see schema below)
```

---

## Usage

```bash
npm start                   # Full purchase flow (headed Chromium)
npm start -- --dry-run      # Full flow, skips the final payment click
PWDEBUG=1 npm start         # Opens Playwright Inspector for selector debugging
```

> **Safety guard:** The final payment confirmation defaults to `No`. You must explicitly type `y` to complete the purchase.

---

## products.json Schema

```json
{
  "items": [
    {
      "name": "Banana",
      "defaultQty": 6,
      "searchQuery": "Banana fruta",
      "mustExclude": ["shampoo", "crema", "jabón"]
    },
    { "name": "Zanahoria", "defaultQty": 2, "notes": "any size" }
  ]
}
```

| Field | Required | Default | Purpose |
|---|---|---|---|
| `name` | yes | — | Display name and fallback search term |
| `defaultQty` | no | `1` | Quantity to add to cart |
| `notes` | no | `null` | Internal note, never sent to the site |
| `searchQuery` | no | `null` | Overrides what is typed into the search box |
| `mustExclude` | no | `[]` | Words that disqualify the first result (rejects junk matches) |

---

## Purchase Log

Every time the checkout button is successfully clicked, the run is recorded in `purchase-log.json` at the project root:

```json
{
  "2026-04-21T14:00": [
    { "name": "Banana", "defaultQty": 6, ... }
  ]
}
```

The key is the local timestamp truncated to the hour. The file is gitignored (runtime data).

---

## Project Structure

```
coto-grocery-weekly-purchase-automation/
├── .env.example                # Credentials template
├── products.json               # Weekly shopping list
├── purchase-log.json           # Auto-generated; gitignored
├── productsNotFound.log        # Auto-generated; overwritten each run
└── src/
    ├── index.js                # Entry point — orchestrates all steps
    ├── browser/
    │   ├── launcher.js         # Playwright browser factory (always clean start)
    │   └── selectors.js        # All selector constants (single source of truth)
    ├── steps/
    │   ├── login.js            # Step 1: Authenticate
    │   ├── search.js           # Step 2: Search, match, add to cart
    │   ├── cart.js             # Step 3: Cart review → checkout
    │   ├── delivery.js         # Step 4: Delivery date + time slot
    │   ├── payment.js          # Step 5: Payment card + installments
    │   ├── confirmation.js     # Step 6: CVV + IVA + final confirm
    │   └── result.js           # Step 7: Success or error display
    ├── ui/
    │   ├── output.js           # chalk print helpers
    │   ├── tables.js           # cli-table3 renderers
    │   └── prompts.js          # @inquirer/prompts wrappers
    └── utils/
        ├── config.js           # Env loader, products.json reader, validation
        ├── purchaseLog.js      # Appends to purchase-log.json on checkout
        ├── pricing.js          # IVA calculation, ARS formatting
        └── errors.js           # Typed error classes, withRetry(), handleFatalError()
```

---

## Flow Overview

| Step | Module | Description |
|---|---|---|
| Pre-step | `launcher.js` | Deletes session file, launches fresh Chromium |
| 1.5 | `index.js` | Clears previous cart contents after login |
| 1 | `login.js` | Fills credentials, waits for redirect |
| 2 | `search.js` | Searches each product, matches by name, excludes junk, sets qty |
| 3 | `cart.js` | Renders cart table, asks to proceed, logs purchase on confirm |
| 4 | `delivery.js` | Shows delivery dates/slots, user selects |
| 5 | `payment.js` | Shows saved cards + installments, user selects |
| 6 | `confirmation.js` | CVV prompt, IVA selection, order summary, final confirm |
| 7 | `result.js` | Displays order ID or error |

---

## Not-Found Log

Products with no matching result are written to `productsNotFound.log` (overwritten each run):

```
Run: 2026-04-21T14:00:00.000Z

- Kiwi (primer resultado: "Kiwi Shampoo Hidratante 400ml")
- Batata Americana
```

---

## Notes

- **Password field:** COTO has a `toLow()` JS handler — the code uses `page.fill()`, never `page.type()`
- **CVV:** Entered via masked terminal prompt, passed directly to `page.fill()`, never stored or logged
- **Selector status:** Login and search selectors are confirmed from live DOM inspection. Cart, delivery, payment, and confirmation selectors are estimates — verify with `PWDEBUG=1 npm start`
