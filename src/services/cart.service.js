'use strict';

// Gestione carrello per utenti registrati e guest. Il guest è identificato da
// un token opaco (header X-Cart-Token) restituito nelle risposte.

const crypto = require('crypto');
const db = require('../models');
const AppError = require('../errors/AppError');
const { computeLine, computeTotals, round2 } = require('../utils/pricing');

const ITEM_INCLUDE = {
  association: 'items',
  include: [
    {
      association: 'variant',
      include: [{ association: 'product', include: [{ association: 'images' }] }],
    },
  ],
};

function effectivePrice(variant) {
  return Number(variant.price != null ? variant.price : variant.product.base_price);
}

async function loadCart(cartId) {
  return db.Cart.findByPk(cartId, { include: [ITEM_INCLUDE] });
}

// Trova o crea il carrello attivo per la richiesta. Se un utente loggato porta
// con sé un token guest, ne assorbe gli articoli (merge) una sola volta.
async function resolveCart(req, { create = true } = {}) {
  const guestToken = req.headers['x-cart-token'] || null;

  if (req.user) {
    let cart = await db.Cart.findOne({ where: { user_id: req.user.id, status: 'active' } });
    if (!cart && create) {
      cart = await db.Cart.create({ user_id: req.user.id, token: crypto.randomUUID() });
    }
    if (cart && guestToken) await mergeGuestCart(guestToken, cart);
    return cart;
  }

  if (guestToken) {
    const cart = await db.Cart.findOne({ where: { token: guestToken, status: 'active' } });
    if (cart) return cart;
  }
  if (!create) return null;
  return db.Cart.create({ user_id: null, token: crypto.randomUUID() });
}

async function mergeGuestCart(guestToken, userCart) {
  const guest = await db.Cart.findOne({
    where: { token: guestToken, status: 'active' },
    include: [{ association: 'items' }],
  });
  if (!guest || guest.id === userCart.id) return;
  for (const gi of guest.items) {
    const existing = await db.CartItem.findOne({
      where: { cart_id: userCart.id, product_variant_id: gi.product_variant_id },
    });
    if (existing) {
      existing.quantity += gi.quantity;
      await existing.save();
    } else {
      await db.CartItem.create({
        cart_id: userCart.id,
        product_variant_id: gi.product_variant_id,
        quantity: gi.quantity,
        unit_price: gi.unit_price,
      });
    }
  }
  guest.status = 'abandoned';
  await guest.save();
}

function serializeCart(cart) {
  const items = (cart.items || []).map((it) => {
    const v = it.variant;
    const p = v?.product;
    const vat = Number(p?.vat_rate ?? 22);
    const calc = computeLine(Number(it.unit_price), it.quantity, vat);
    const imgs = p?.images || [];
    return {
      item_id: it.id,
      variant_id: it.product_variant_id,
      product_name: p?.name,
      product_slug: p?.slug,
      variant_name: v?.name,
      sku: v?.sku,
      unit_price: round2(it.unit_price),
      quantity: it.quantity,
      vat_rate: vat,
      ...calc,
      stock: v?.stock,
      in_stock: (v?.stock ?? 0) >= it.quantity,
      image: imgs.length ? imgs[0].object_key : null,
    };
  });
  const totals = computeTotals(items);
  return {
    cart_token: cart.token,
    item_count: items.reduce((s, i) => s + i.quantity, 0),
    items,
    ...totals,
  };
}

async function getCart(req) {
  const cart = await resolveCart(req, { create: false });
  if (!cart) return { cart_token: null, item_count: 0, items: [], subtotal: 0, vat_total: 0, shipping_total: 0, grand_total: 0 };
  return serializeCart(await loadCart(cart.id));
}

async function addItem(req, { variant_id, quantity }) {
  const variant = await db.ProductVariant.findByPk(variant_id, {
    include: [{ association: 'product' }],
  });
  if (!variant || !variant.is_active || !variant.product.is_active) {
    throw AppError.notFound('Variante non disponibile');
  }

  const cart = await resolveCart(req);
  const existing = await db.CartItem.findOne({
    where: { cart_id: cart.id, product_variant_id: variant_id },
  });
  const newQty = (existing ? existing.quantity : 0) + quantity;
  if (newQty > variant.stock) throw AppError.conflict(`Disponibilità insufficiente (stock ${variant.stock})`);

  if (existing) {
    existing.quantity = newQty;
    existing.unit_price = effectivePrice(variant);
    await existing.save();
  } else {
    await db.CartItem.create({
      cart_id: cart.id,
      product_variant_id: variant_id,
      quantity,
      unit_price: effectivePrice(variant),
    });
  }
  return serializeCart(await loadCart(cart.id));
}

async function updateItem(req, itemId, quantity) {
  const cart = await resolveCart(req, { create: false });
  if (!cart) throw AppError.notFound('Carrello non trovato');
  const item = await db.CartItem.findOne({
    where: { id: itemId, cart_id: cart.id },
    include: [{ association: 'variant' }],
  });
  if (!item) throw AppError.notFound('Articolo non nel carrello');

  if (quantity === 0) {
    await item.destroy();
  } else {
    if (quantity > item.variant.stock) throw AppError.conflict(`Disponibilità insufficiente (stock ${item.variant.stock})`);
    item.quantity = quantity;
    await item.save();
  }
  return serializeCart(await loadCart(cart.id));
}

async function removeItem(req, itemId) {
  const cart = await resolveCart(req, { create: false });
  if (!cart) throw AppError.notFound('Carrello non trovato');
  const item = await db.CartItem.findOne({ where: { id: itemId, cart_id: cart.id } });
  if (!item) throw AppError.notFound('Articolo non nel carrello');
  await item.destroy();
  return serializeCart(await loadCart(cart.id));
}

async function clearCart(req) {
  const cart = await resolveCart(req, { create: false });
  if (cart) await db.CartItem.destroy({ where: { cart_id: cart.id } });
  return getCart(req);
}

module.exports = {
  resolveCart,
  loadCart,
  serializeCart,
  effectivePrice,
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
};
