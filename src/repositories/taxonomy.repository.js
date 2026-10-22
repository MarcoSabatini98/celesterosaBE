'use strict';

// Accesso dati per la gestione admin di marche e categorie (CRUD + logo/immagine
// su MinIO + conteggi prodotti per il blocco eliminazione).
const crypto = require('crypto');
const slugify = require('slugify');
const { fn, col } = require('sequelize');
const { sequelize, Brand, Category, Product, AttributeDefinition } = require('../models');
const storage = require('../utils/storage');

const toSlug = (s) => slugify(s, { lower: true, strict: true, locale: 'it' });

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

// ── Conteggi prodotti ─────────────────────────────────────────
async function brandProductCounts() {
  const rows = await Product.findAll({
    attributes: ['brand_id', [fn('COUNT', col('id')), 'count']],
    group: ['brand_id'],
    raw: true,
  });
  return Object.fromEntries(rows.filter((r) => r.brand_id != null).map((r) => [r.brand_id, Number(r.count)]));
}

async function categoryProductCounts() {
  const rows = await Product.findAll({
    attributes: ['category_id', [fn('COUNT', col('id')), 'count']],
    group: ['category_id'],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.category_id, Number(r.count)]));
}

// ── Marche ────────────────────────────────────────────────────
function findAllBrands() {
  return Brand.findAll({ order: [['name', 'ASC']] });
}

function createBrand(data) {
  return Brand.create({ ...data, slug: toSlug(data.name) });
}

async function updateBrand(id, data) {
  const brand = await Brand.findByPk(id);
  if (!brand) return null;
  const patch = { ...data };
  if (data.name) patch.slug = toSlug(data.name);
  await brand.update(patch);
  return brand;
}

// Esito: { status: 'notfound' | 'inuse' | 'ok', count? }
async function deleteBrand(id) {
  const brand = await Brand.findByPk(id);
  if (!brand) return { status: 'notfound' };
  const count = await Product.count({ where: { brand_id: id } });
  if (count > 0) return { status: 'inuse', count };
  if (brand.logo_key) await storage.removeObject(brand.logo_key).catch(() => {});
  await brand.destroy();
  return { status: 'ok' };
}

async function setBrandLogo(id, file) {
  const brand = await Brand.findByPk(id);
  if (!brand) return null;
  if (brand.logo_key) await storage.removeObject(brand.logo_key).catch(() => {});
  const ext = EXT_BY_MIME[file.mimetype] || 'bin';
  const key = `brands/${id}/${crypto.randomUUID()}.${ext}`;
  await storage.putObject(key, file.buffer, file.mimetype);
  await brand.update({ logo_key: key });
  return brand;
}

// ── Categorie ─────────────────────────────────────────────────
function findAllCategoriesTree() {
  return Category.findAll({
    where: { parent_id: null },
    order: [
      ['sort_order', 'ASC'],
      ['name', 'ASC'],
      [{ model: Category, as: 'children' }, 'sort_order', 'ASC'],
    ],
    include: [{ model: Category, as: 'children', required: false }],
  });
}

function createCategory(data) {
  return Category.create({ ...data, slug: toSlug(data.name) });
}

async function updateCategory(id, data) {
  const category = await Category.findByPk(id);
  if (!category) return null;
  const patch = { ...data };
  if (data.name) patch.slug = toSlug(data.name);
  await category.update(patch);
  return category;
}

// Esito: { status: 'notfound' | 'haschildren' | 'inuse' | 'ok', count? }
async function deleteCategory(id) {
  const category = await Category.findByPk(id);
  if (!category) return { status: 'notfound' };

  const children = await Category.count({ where: { parent_id: id } });
  if (children > 0) return { status: 'haschildren', count: children };

  const products = await Product.count({ where: { category_id: id } });
  if (products > 0) return { status: 'inuse', count: products };

  if (category.image_key) await storage.removeObject(category.image_key).catch(() => {});
  // Le definizioni attributi della categoria vanno rimosse prima (FK).
  await sequelize.transaction(async (transaction) => {
    await AttributeDefinition.destroy({ where: { category_id: id }, transaction });
    await category.destroy({ transaction });
  });
  return { status: 'ok' };
}

async function setCategoryImage(id, file) {
  const category = await Category.findByPk(id);
  if (!category) return null;
  if (category.image_key) await storage.removeObject(category.image_key).catch(() => {});
  const ext = EXT_BY_MIME[file.mimetype] || 'bin';
  const key = `categories/${id}/${crypto.randomUUID()}.${ext}`;
  await storage.putObject(key, file.buffer, file.mimetype);
  await category.update({ image_key: key });
  return category;
}

module.exports = {
  brandProductCounts,
  categoryProductCounts,
  findAllBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  setBrandLogo,
  findAllCategoriesTree,
  createCategory,
  updateCategory,
  deleteCategory,
  setCategoryImage,
};
