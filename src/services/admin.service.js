'use strict';

// Logica dell'area amministrativa: gestione catalogo (prodotti, varianti,
// attributi, immagini) e ordini. Restituisce DTO pronti per il frontend.

const AppError = require('../errors/AppError');
const adminRepository = require('../repositories/admin.repository');
const orderRepository = require('../repositories/order.repository');
const { parsePagination, toPaginated } = require('../utils/pagination');
const { toProductDetail } = require('../serializers/catalog.serializer');
const { toOrder } = require('../serializers/order.serializer');

// Timestamp da impostare per alcune transizioni di stato dell'ordine.
const STATUS_TIMESTAMP = {
  shipped: 'shipped_at',
  delivered: 'delivered_at',
  cancelled: 'cancelled_at',
};

// ── Prodotti ──────────────────────────────────────────────────
async function listProducts(query = {}) {
  const pagination = parsePagination(query);
  const { rows, count } = await adminRepository.findProductIds({
    q: query.q,
    limit: pagination.limit,
    offset: pagination.offset,
  });

  const products = await Promise.all(rows.map((r) => adminRepository.findFullById(r.id)));
  return toPaginated(products.map(toProductDetail), count, pagination);
}

async function getProduct(id) {
  const product = await adminRepository.findFullById(id);
  if (!product) throw AppError.notFound('Prodotto non trovato');
  return toProductDetail(product);
}

async function createProduct(input) {
  return toProductDetail(await adminRepository.createProduct(input));
}

async function updateProduct(id, input) {
  const product = await adminRepository.updateProduct(id, input);
  if (!product) throw AppError.notFound('Prodotto non trovato');
  return toProductDetail(product);
}

async function deleteProduct(id) {
  const ok = await adminRepository.deleteProduct(id);
  if (!ok) throw AppError.notFound('Prodotto non trovato');
  return { deleted: true, id: Number(id) };
}

async function setAttributes(id, attributes) {
  const product = await adminRepository.setAttributes(id, attributes);
  if (!product) throw AppError.notFound('Prodotto non trovato');
  return toProductDetail(product);
}

// ── Varianti ──────────────────────────────────────────────────
async function addVariant(productId, input) {
  const product = await adminRepository.addVariant(productId, input);
  if (!product) throw AppError.notFound('Prodotto non trovato');
  return toProductDetail(product);
}

async function deleteVariant(variantId) {
  const product = await adminRepository.deleteVariant(variantId);
  if (!product) throw AppError.notFound('Variante non trovata');
  return toProductDetail(product);
}

// ── Immagini ──────────────────────────────────────────────────
async function addImages(productId, files) {
  if (!files || !files.length) throw AppError.unprocessable('Nessuna immagine caricata');
  const product = await adminRepository.addImages(productId, files);
  if (!product) throw AppError.notFound('Prodotto non trovato');
  return toProductDetail(product);
}

async function deleteImage(imageId) {
  const product = await adminRepository.deleteImage(imageId);
  if (!product) throw AppError.notFound('Immagine non trovata');
  return toProductDetail(product);
}

// ── Ordini ────────────────────────────────────────────────────
async function listOrders(query = {}) {
  const pagination = parsePagination(query);
  const { rows, count } = await orderRepository.findAndCountAll(pagination);
  return toPaginated(rows.map(toOrder), count, pagination);
}

async function updateOrderStatus(orderNumber, status) {
  const order = await orderRepository.findByNumber(orderNumber);
  if (!order) throw AppError.notFound('Ordine non trovato');

  const patch = { status };
  const tsField = STATUS_TIMESTAMP[status];
  if (tsField && !order[tsField]) patch[tsField] = new Date();

  await order.update(patch);
  return toOrder(await orderRepository.reloadOrder(order.id));
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  setAttributes,
  addVariant,
  deleteVariant,
  addImages,
  deleteImage,
  listOrders,
  updateOrderStatus,
};
