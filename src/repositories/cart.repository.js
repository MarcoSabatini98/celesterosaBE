'use strict';

// Accesso dati al carrello e alle sue righe. Il carrello carica sempre gli
// item con variante → prodotto (+ immagini) per permettere al serializer di
// calcolare prezzi, IVA e disponibilità.
const { Cart, CartItem, ProductVariant, Product, ProductImage } = require('../models');

// Include riutilizzabile: righe ordinate con tutto il necessario alla
// serializzazione.
function itemsInclude() {
  return [
    {
      model: CartItem,
      as: 'items',
      separate: true,
      order: [['id', 'ASC']],
      include: [
        {
          model: ProductVariant,
          as: 'variant',
          include: [
            { model: Product, as: 'product', include: [{ model: ProductImage, as: 'images' }] },
            { model: ProductImage, as: 'images' },
          ],
        },
      ],
    },
  ];
}

function findActiveByUser(userId) {
  return Cart.findOne({ where: { user_id: userId, status: 'active' }, include: itemsInclude() });
}

function findActiveByToken(token) {
  return Cart.findOne({ where: { token, status: 'active' }, include: itemsInclude() });
}

function create({ userId = null, token }) {
  return Cart.create({ user_id: userId, token, status: 'active' });
}

// Ricarica il carrello con gli item aggiornati dopo una mutazione.
function reload(cartId) {
  return Cart.findByPk(cartId, { include: itemsInclude() });
}

// Variante con il prodotto (per prezzo base e IVA) e le immagini.
function findVariant(variantId) {
  return ProductVariant.findByPk(variantId, {
    include: [
      { model: Product, as: 'product', include: [{ model: ProductImage, as: 'images' }] },
      { model: ProductImage, as: 'images' },
    ],
  });
}

function findItemByVariant(cartId, variantId) {
  return CartItem.findOne({ where: { cart_id: cartId, product_variant_id: variantId } });
}

function findItemById(cartId, itemId) {
  return CartItem.findOne({ where: { cart_id: cartId, id: itemId } });
}

function addItem(data) {
  return CartItem.create(data);
}

function clearItems(cartId) {
  return CartItem.destroy({ where: { cart_id: cartId } });
}

module.exports = {
  findActiveByUser,
  findActiveByToken,
  create,
  reload,
  findVariant,
  findItemByVariant,
  findItemById,
  addItem,
  clearItems,
};
