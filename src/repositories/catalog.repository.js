'use strict';

// Accesso dati del catalogo pubblico (sola lettura).

const { Op } = require('sequelize');
const db = require('../models');

function getActiveCategories() {
  return db.Category.findAll({
    where: { is_active: true },
    order: [
      ['sort_order', 'ASC'],
      ['name', 'ASC'],
    ],
  });
}

function getCategoryBySlug(slug) {
  return db.Category.findOne({
    where: { slug, is_active: true },
    include: [
      {
        association: 'attributeDefinitions',
        separate: true,
        order: [['sort_order', 'ASC']],
      },
    ],
  });
}

// ID della categoria e di tutte le sue discendenti (per filtrare i prodotti
// anche quando si seleziona una categoria di primo livello).
async function getCategorySubtreeIds(slug) {
  const root = await db.Category.findOne({ where: { slug } });
  if (!root) return [];
  const all = await db.Category.findAll({ attributes: ['id', 'parent_id'] });
  const childrenOf = new Map();
  for (const c of all) {
    const key = c.parent_id || 0;
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key).push(c.id);
  }
  const ids = [];
  const stack = [root.id];
  while (stack.length) {
    const id = stack.pop();
    ids.push(id);
    for (const child of childrenOf.get(id) || []) stack.push(child);
  }
  return ids;
}

function getActiveBrands() {
  return db.Brand.findAll({
    where: { is_active: true },
    order: [['name', 'ASC']],
  });
}

const SORT_MAP = {
  price_asc: [['base_price', 'ASC']],
  price_desc: [['base_price', 'DESC']],
  newest: [['created_at', 'DESC']],
  name: [['name', 'ASC']],
};

async function listProducts(filters) {
  const { q, categoryIds, brandId, condition, featured, min_price, max_price, sort, page, limit } =
    filters;

  const where = { is_active: true };
  if (categoryIds && categoryIds.length) where.category_id = { [Op.in]: categoryIds };
  if (brandId) where.brand_id = brandId;
  if (condition) where.condition = condition;
  if (featured != null) where.is_featured = featured;
  if (min_price != null || max_price != null) {
    where.base_price = {};
    if (min_price != null) where.base_price[Op.gte] = min_price;
    if (max_price != null) where.base_price[Op.lte] = max_price;
  }
  if (q) {
    where[Op.or] = [
      { name: { [Op.like]: `%${q}%` } },
      { short_description: { [Op.like]: `%${q}%` } },
      { sku: { [Op.like]: `%${q}%` } },
    ];
  }

  return db.Product.findAndCountAll({
    where,
    include: [
      { association: 'brand', attributes: ['id', 'name', 'slug'] },
      { association: 'category', attributes: ['id', 'name', 'slug'] },
      { association: 'images', separate: true, order: [['sort_order', 'ASC']] },
      {
        association: 'variants',
        separate: true,
        where: { is_active: true },
        required: false,
        order: [['is_default', 'DESC']],
      },
    ],
    order: SORT_MAP[sort] || SORT_MAP.newest,
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });
}

function getProductBySlug(slug) {
  return db.Product.findOne({
    where: { slug, is_active: true },
    include: [
      { association: 'brand' },
      { association: 'category' },
      { association: 'images', separate: true, order: [['sort_order', 'ASC']] },
      {
        association: 'variants',
        where: { is_active: true },
        required: false,
        separate: true,
        order: [['is_default', 'DESC']],
      },
      { association: 'attributes', include: [{ association: 'definition' }] },
    ],
  });
}

module.exports = {
  getActiveCategories,
  getCategoryBySlug,
  getCategorySubtreeIds,
  getActiveBrands,
  listProducts,
  getProductBySlug,
};
