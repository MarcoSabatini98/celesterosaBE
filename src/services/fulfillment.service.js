'use strict';

// Effetti post-pagamento aggiuntivi (generazione fattura, invio email).
// Implementati nella Fase 7; per ora è un no-op che riceve l'id ordine.
async function onOrderPaid(_orderId) {
  // TODO Fase 7: genera fattura PDF su MinIO e invia email di conferma.
}

module.exports = onOrderPaid;
