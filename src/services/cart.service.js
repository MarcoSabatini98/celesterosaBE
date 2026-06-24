'use strict';

// Logica del carrello. Identità del carrello:
//   - utente autenticato → carrello attivo legato a user_id;
//   - guest → carrello identificato da un token opaco (header X-Cart-Token),
//     creato alla prima aggiunta e restituito al client come cart_token.
// I prezzi delle righe sono congelati come snapshot (unit_price) al momento
// dell'aggiunta/aggiornamento.

const crypto = require('crypto');
const AppError = require('../errors/AppError');
const cartRepository = require('../repositories/cart.repository');
const { toCart, emptyCart } = require('../serializers/cart.serializer');

function newToken() {
  return crypto.randomBytes(24).toString('base64url');
}

// Prezzo effettivo della variante (proprio o base del prodotto).
function effectivePrice(variant) {
  return variant.price != null ? Number(variant.price) : Number(variant.product.base_price);
}

// Recupera il carrello attivo del richiedente. Con create=true ne crea uno se
// assente (necessario per le aggiunte).
async function resolveCart(req, { create = false } = {}) {
  if (req.user) {
    let cart = await cartRepository.findActiveByUser(req.user.id);
    if (!cart && create) cart = await cartRepository.create({ userId: req.user.id, token: newToken() });
    return cart;
  }

  const token = req.headers['x-cart-token'];
  if (token) {
    const cart = await cartRepository.findActiveByToken(token);
    if (cart) return cart;
  }
  return create ? cartRepository.create({ token: newToken() }) : null;
}

async function serialized(cartId) {
  return toCart(await cartRepository.reload(cartId));
}

// GET /cart — carrello corrente o vuoto (senza crearne uno).
async function getCart(req) {
  const cart = await resolveCart(req, { create: false });
  return cart ? toCart(cart) : emptyCart();
}

// POST /cart/items — aggiunge una variante (somma se già presente).
async function addItem(req, { variant_id, quantity }) {
  const variant = await cartRepository.findVariant(variant_id);
  if (!variant || variant.is_active === false) throw AppError.notFound('Variante non trovata');

  const cart = await resolveCart(req, { create: true });
  const existing = await cartRepository.findItemByVariant(cart.id, variant_id);
  const newQty = (existing ? existing.quantity : 0) + quantity;

  if (newQty > variant.stock) throw AppError.unprocessable('Quantità richiesta superiore allo stock');

  const unitPrice = effectivePrice(variant);
  if (existing) {
    await existing.update({ quantity: newQty, unit_price: unitPrice });
  } else {
    await cartRepository.addItem({
      cart_id: cart.id,
      product_variant_id: variant_id,
      quantity,
      unit_price: unitPrice,
    });
  }

  return serialized(cart.id);
}

// PUT /cart/items/:itemId — imposta la quantità di una riga.
async function updateItem(req, itemId, { quantity }) {
  const cart = await resolveCart(req, { create: false });
  if (!cart) throw AppError.notFound('Carrello non trovato');

  const item = await cartRepository.findItemById(cart.id, itemId);
  if (!item) throw AppError.notFound('Articolo non nel carrello');

  const variant = await cartRepository.findVariant(item.product_variant_id);
  if (quantity > variant.stock) throw AppError.unprocessable('Quantità richiesta superiore allo stock');

  await item.update({ quantity });
  return serialized(cart.id);
}

// DELETE /cart/items/:itemId — rimuove una riga.
async function removeItem(req, itemId) {
  const cart = await resolveCart(req, { create: false });
  if (!cart) throw AppError.notFound('Carrello non trovato');

  const item = await cartRepository.findItemById(cart.id, itemId);
  if (!item) throw AppError.notFound('Articolo non nel carrello');

  await item.destroy();
  return serialized(cart.id);
}

// DELETE /cart — svuota il carrello.
async function clear(req) {
  const cart = await resolveCart(req, { create: false });
  if (!cart) return emptyCart();

  await cartRepository.clearItems(cart.id);
  return serialized(cart.id);
}

module.exports = { getCart, addItem, updateItem, removeItem, clear };
