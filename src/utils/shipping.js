'use strict';

// Regola di spedizione: tariffa fissa, gratis sopra una soglia. Importi
// configurabili via env (SHIPPING_FLAT, SHIPPING_FREE_THRESHOLD). Il calcolo
// usa il totale lordo (IVA inclusa) del carrello.

const FLAT = Number(process.env.SHIPPING_FLAT ?? 9.9);
const FREE_THRESHOLD = Number(process.env.SHIPPING_FREE_THRESHOLD ?? 99);

// Carrello vuoto → nessuna spedizione. Totale ≥ soglia → gratis. Altrimenti
// tariffa fissa.
function computeShipping(grossTotal) {
  if (!grossTotal || grossTotal <= 0) return 0;
  return grossTotal >= FREE_THRESHOLD ? 0 : FLAT;
}

module.exports = { computeShipping, SHIPPING_FLAT: FLAT, SHIPPING_FREE_THRESHOLD: FREE_THRESHOLD };
