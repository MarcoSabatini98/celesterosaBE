'use strict';

// Accesso dati ai prodotti del catalogo pubblico (solo prodotti attivi).
const { Op } = require('sequelize');
const {
  Product,
  Brand,
  Category,
  ProductVariant,
  ProductImage,
  ProductAttribute,
  AttributeDefinition,
} = require('../models');

// Mappa il parametro `sort` del FE in una clausola ORDER BY.
const SORT_MAP = {
  price_asc: [['base_price', 'ASC']],
  price_desc: [['base_price', 'DESC']],
  newest: [['createdAt', 'DESC']],
  name: [['name', 'ASC']],
};

function orderBy(sort) {
  return SORT_MAP[sort] || SORT_MAP.newest;
}

function buildWhere(filters, categoryIds) {
  const where = { is_active: true };

  if (categoryIds) where.category_id = { [Op.in]: categoryIds };
  if (filters.condition) where.condition = filters.condition;
  if (filters.featured != null) where.is_featured = filters.featured;

  if (filters.min_price != null || filters.max_price != null) {
    where.base_price = {};
    if (filters.min_price != null) where.base_price[Op.gte] = filters.min_price;
    if (filters.max_price != null) where.base_price[Op.lte] = filters.max_price;
  }

  if (filters.q) {
    const like = { [Op.like]: `%${filters.q}%` };
    where[Op.or] = [{ name: like }, { short_description: like }];
  }

  return where;
}

// Listato paginato. `categoryIds` (opzionale) restringe alle categorie indicate
// (categoria selezionata + figlie, risolte a monte nel service).
function findAndCount({ filters, categoryIds, pagination, sort }) {
  const brandInclude = {
    model: Brand,
    as: 'brand',
    attributes: ['id', 'name', 'slug'],
    required: Boolean(filters.brand),
    ...(filters.brand ? { where: { slug: filters.brand } } : {}),
  };

  return Product.findAndCountAll({
    where: buildWhere(filters, categoryIds),
    include: [
      brandInclude,
      { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
      {
        model: ProductVariant,
        as: 'variants',
        attributes: ['id', 'price', 'stock', 'is_active'],
        required: false,
      },
      {
        model: ProductImage,
        as: 'images',
        attributes: ['id', 'object_key', 'alt', 'is_primary', 'variant_id', 'sort_order'],
        required: false,
      },
    ],
    order: orderBy(sort),
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true, // conteggio corretto con le include hasMany
  });
}

// Dettaglio completo per slug: varianti, immagini e attributi EAV con le loro
// definizioni. `separate: true` evita la moltiplicazione delle righe e permette
// l'ordinamento per ciascuna collezione.
function findBySlug(slug) {
  return Product.findOne({
    where: { slug, is_active: true },
    include: [
      { model: Brand, as: 'brand', attributes: ['id', 'name', 'slug'] },
      { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
      {
        model: ProductVariant,
        as: 'variants',
        required: false,
        separate: true,
        order: [
          ['is_default', 'DESC'],
          ['id', 'ASC'],
        ],
      },
      {
        model: ProductImage,
        as: 'images',
        required: false,
        separate: true,
        order: [['sort_order', 'ASC']],
      },
      {
        model: ProductAttribute,
        as: 'attributes',
        required: false,
        separate: true,
        include: [{ model: AttributeDefinition, as: 'definition' }],
      },
    ],
  });
}

module.exports = { findAndCount, findBySlug };
