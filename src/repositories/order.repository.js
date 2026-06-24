'use strict';

// Accesso dati a ordini, righe d'ordine e pagamenti.
const { Order, OrderItem, Payment, Invoice, ProductVariant } = require('../models');

// Include completo per la serializzazione dell'ordine.
function orderInclude() {
  return [
    { model: OrderItem, as: 'items', separate: true, order: [['id', 'ASC']] },
    { model: Payment, as: 'payment' },
    { model: Invoice, as: 'invoice' },
  ];
}

// Crea ordine + righe in transazione (la transazione è gestita dal service).
async function createOrder(orderData, items, transaction) {
  const order = await Order.create(orderData, { transaction });
  await OrderItem.bulkCreate(
    items.map((it) => ({ ...it, order_id: order.id })),
    { transaction },
  );
  return order;
}

function createPayment(data, transaction) {
  return Payment.create(data, { transaction });
}

function reloadOrder(id) {
  return Order.findByPk(id, { include: orderInclude() });
}

function findByNumber(orderNumber) {
  return Order.findOne({ where: { order_number: orderNumber }, include: orderInclude() });
}

function findPaymentByIntent(paymentIntentId) {
  return Payment.findOne({
    where: { stripe_payment_intent_id: paymentIntentId },
    include: [{ model: Order, as: 'order' }],
  });
}

function getItems(orderId, transaction) {
  return OrderItem.findAll({ where: { order_id: orderId }, transaction });
}

// Scala lo stock delle varianti per le righe dell'ordine (a pagamento riuscito).
async function decrementStock(items, transaction) {
  for (const it of items) {
    if (!it.product_variant_id) continue;
    await ProductVariant.decrement('stock', {
      by: it.quantity,
      where: { id: it.product_variant_id },
      transaction,
    });
  }
}

module.exports = {
  createOrder,
  createPayment,
  reloadOrder,
  findByNumber,
  findPaymentByIntent,
  getItems,
  decrementStock,
};
