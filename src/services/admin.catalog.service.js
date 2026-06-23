'use strict';

// Logica del backoffice: CRUD di brand, categorie, attributi, prodotti,
// varianti e immagini. Solo per ruolo admin (enforce a livello di rotta).

const { Op } = require('sequelize');
const db = require('../models');
const AppError = require('../errors/AppError');
const { toSlug } = require('../../database/seed-helpers/slug');
const { paginate, parsePageParams } = require('../utils/paginate');
const storage = require('./storage.service');

// ─── Brand ────────────────────────────────────────────────────
async function createBrand(data) {
  return db.Brand.create({ ...data, slug: toSlug(data.name) });
}

async function updateBrand(id, data) {
  const brand = await db.Brand.findByPk(id);
  if (!brand) throw AppError.notFound('Brand non trovato');
  if (data.name) data.slug = toSlug(data.name);
  return brand.update(data);
}

async function deleteBrand(id) {
  const brand = await db.Brand.findByPk(id);
  if (!brand) throw AppError.notFound('Brand non trovato');
  await brand.destroy();
}

// ─── Categorie ────────────────────────────────────────────────
async function createCategory(data) {
  if (data.parent_id) {
    const parent = await db.Category.findByPk(data.parent_id);
    if (!parent) throw AppError.badRequest('Categoria padre inesistente');
  }
  return db.Category.create({ ...data, slug: toSlug(data.name) });
}

async function updateCategory(id, data) {
  const category = await db.Category.findByPk(id);
  if (!category) throw AppError.notFound('Categoria non trovata');
  if (data.parent_id === id) throw AppError.badRequest('Una categoria non può essere padre di sé stessa');
  if (data.name) data.slug = toSlug(data.name);
  return category.update(data);
}

async function deleteCategory(id) {
  const category = await db.Category.findByPk(id);
  if (!category) throw AppError.notFound('Categoria non trovata');
  const productCount = await db.Product.count({ where: { category_id: id } });
  if (productCount > 0) throw AppError.conflict('Categoria con prodotti associati: non eliminabile');
  await category.destroy();
}

async function createAttributeDefinition(categoryId, data) {
  const category = await db.Category.findByPk(categoryId);
  if (!category) throw AppError.notFound('Categoria non trovata');
  const exists = await db.AttributeDefinition.findOne({
    where: { category_id: categoryId, code: data.code },
  });
  if (exists) throw AppError.conflict('Attributo già definito per questa categoria');
  return db.AttributeDefinition.create({ ...data, category_id: categoryId });
}

// ─── Prodotti ─────────────────────────────────────────────────
async function listProducts(query = {}) {
  const { page, limit } = parsePageParams(query);
  const where = {};
  if (query.q) where[Op.or] = [{ name: { [Op.like]: `%${query.q}%` } }, { sku: { [Op.like]: `%${query.q}%` } }];
  const { count, rows } = await db.Product.findAndCountAll({
    where,
    include: [
      { association: 'brand', attributes: ['id', 'name'] },
      { association: 'category', attributes: ['id', 'name'] },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  return paginate(rows, count, page, limit);
}

async function getProduct(id) {
  const product = await db.Product.findByPk(id, {
    include: [
      { association: 'brand' },
      { association: 'category' },
      { association: 'variants' },
      { association: 'images' },
      { association: 'attributes', include: [{ association: 'definition' }] },
    ],
  });
  if (!product) throw AppError.notFound('Prodotto non trovato');
  return product;
}

async function createProduct(data) {
  const category = await db.Category.findByPk(data.category_id);
  if (!category) throw AppError.badRequest('Categoria inesistente');
  if (data.brand_id) {
    const brand = await db.Brand.findByPk(data.brand_id);
    if (!brand) throw AppError.badRequest('Brand inesistente');
  }
  return db.Product.create({ ...data, slug: toSlug(`${data.name}-${data.sku}`) });
}

async function updateProduct(id, data) {
  const product = await db.Product.findByPk(id);
  if (!product) throw AppError.notFound('Prodotto non trovato');
  if (data.name || data.sku) {
    data.slug = toSlug(`${data.name || product.name}-${data.sku || product.sku}`);
  }
  return product.update(data);
}

async function deleteProduct(id) {
  const product = await db.Product.findByPk(id, { include: [{ association: 'images' }] });
  if (!product) throw AppError.notFound('Prodotto non trovato');
  // Rimuove gli oggetti immagine da MinIO prima di cancellare (le righe vanno
  // via in cascade via FK).
  for (const img of product.images || []) {
    await storage.removeObject(img.object_key).catch(() => {});
  }
  await product.destroy();
}

// ─── Varianti ─────────────────────────────────────────────────
async function addVariant(productId, data) {
  const product = await db.Product.findByPk(productId);
  if (!product) throw AppError.notFound('Prodotto non trovato');
  if (data.is_default) {
    await db.ProductVariant.update({ is_default: false }, { where: { product_id: productId } });
  }
  return db.ProductVariant.create({ ...data, product_id: productId });
}

async function updateVariant(id, data) {
  const variant = await db.ProductVariant.findByPk(id);
  if (!variant) throw AppError.notFound('Variante non trovata');
  if (data.is_default) {
    await db.ProductVariant.update(
      { is_default: false },
      { where: { product_id: variant.product_id } },
    );
  }
  return variant.update(data);
}

async function deleteVariant(id) {
  const variant = await db.ProductVariant.findByPk(id);
  if (!variant) throw AppError.notFound('Variante non trovata');
  await variant.destroy();
}

// ─── Immagini ─────────────────────────────────────────────────
async function addImages(productId, files, { variantId = null } = {}) {
  const product = await db.Product.findByPk(productId);
  if (!product) throw AppError.notFound('Prodotto non trovato');
  if (!files || !files.length) throw AppError.badRequest('Nessuna immagine ricevuta');

  const existingCount = await db.ProductImage.count({ where: { product_id: productId } });
  const created = [];
  let i = existingCount;
  for (const file of files) {
    const key = await storage.uploadImage(file.buffer, file.mimetype, `products/${productId}`);
    const image = await db.ProductImage.create({
      product_id: productId,
      variant_id: variantId,
      object_key: key,
      alt: product.name,
      sort_order: i,
      is_primary: i === 0, // la prima immagine in assoluto è la primaria
    });
    created.push(image);
    i += 1;
  }
  return created;
}

async function deleteImage(id) {
  const image = await db.ProductImage.findByPk(id);
  if (!image) throw AppError.notFound('Immagine non trovata');
  await storage.removeObject(image.object_key).catch(() => {});
  await image.destroy();
}

// ─── Attributi EAV del prodotto ───────────────────────────────
function eavValue(dataType, raw) {
  switch (dataType) {
    case 'number':
      return { value_number: raw, value_string: null, value_boolean: null, value_date: null };
    case 'boolean':
      return { value_boolean: !!raw, value_string: null, value_number: null, value_date: null };
    case 'date':
      return { value_date: raw, value_string: null, value_number: null, value_boolean: null };
    default:
      return { value_string: String(raw), value_number: null, value_boolean: null, value_date: null };
  }
}

async function setAttributes(productId, attributes) {
  const product = await db.Product.findByPk(productId);
  if (!product) throw AppError.notFound('Prodotto non trovato');

  const defs = await db.AttributeDefinition.findAll({
    where: { category_id: product.category_id },
  });
  const defByCode = Object.fromEntries(defs.map((d) => [d.code, d]));

  for (const [code, raw] of Object.entries(attributes)) {
    const def = defByCode[code];
    if (!def) throw AppError.badRequest(`Attributo non valido per la categoria: ${code}`);
    const values = eavValue(def.data_type, raw);
    const existing = await db.ProductAttribute.findOne({
      where: { product_id: productId, attribute_definition_id: def.id },
    });
    if (existing) await existing.update(values);
    else
      await db.ProductAttribute.create({
        product_id: productId,
        attribute_definition_id: def.id,
        ...values,
      });
  }
  return getProduct(productId);
}

module.exports = {
  createBrand,
  updateBrand,
  deleteBrand,
  createCategory,
  updateCategory,
  deleteCategory,
  createAttributeDefinition,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  addImages,
  deleteImage,
  setAttributes,
};
