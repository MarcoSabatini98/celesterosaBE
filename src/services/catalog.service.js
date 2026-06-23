'use strict';

// Logica del catalogo pubblico: composizione albero categorie, filtri prodotti
// e serializzazione con URL immagini e prezzi effettivi delle varianti.

const AppError = require('../errors/AppError');
const repo = require('../repositories/catalog.repository');
const db = require('../models');
const { publicUrl } = require('../config/minio');

function num(v) {
  return v == null ? null : Number(v);
}

function serializeImage(img) {
  return {
    id: img.id,
    url: publicUrl(img.object_key),
    alt: img.alt,
    is_primary: img.is_primary,
    variant_id: img.variant_id,
  };
}

function serializeVariant(v, basePrice) {
  return {
    id: v.id,
    sku: v.sku,
    name: v.name,
    color: v.color,
    finish: v.finish,
    handedness: v.handedness,
    size: v.size,
    price: num(v.price != null ? v.price : basePrice),
    stock: v.stock,
    in_stock: v.stock > 0,
    is_default: v.is_default,
  };
}

// Prezzo "a partire da": il minimo tra i prezzi effettivi delle varianti.
function priceFrom(product) {
  const base = num(product.base_price);
  const variantPrices = (product.variants || []).map((v) => num(v.price != null ? v.price : base));
  return variantPrices.length ? Math.min(...variantPrices) : base;
}

function serializeProductCard(p) {
  const images = (p.images || []).map(serializeImage);
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    short_description: p.short_description,
    condition: p.condition,
    base_price: num(p.base_price),
    price_from: priceFrom(p),
    vat_rate: num(p.vat_rate),
    is_featured: p.is_featured,
    rating_avg: num(p.rating_avg),
    rating_count: p.rating_count,
    brand: p.brand ? { id: p.brand.id, name: p.brand.name, slug: p.brand.slug } : null,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    primary_image: images.find((i) => i.is_primary) || images[0] || null,
    total_stock: (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
  };
}

function serializeProductDetail(p) {
  const base = num(p.base_price);
  return {
    ...serializeProductCard(p),
    description: p.description,
    images: (p.images || []).map(serializeImage),
    variants: (p.variants || []).map((v) => serializeVariant(v, base)),
    attributes: (p.attributes || [])
      .filter((a) => a.definition)
      .map((a) => ({
        code: a.definition.code,
        label: a.definition.label,
        unit: a.definition.unit,
        value: a.value_string ?? num(a.value_number) ?? a.value_boolean ?? a.value_date,
      })),
  };
}

// Costruisce l'albero gerarchico delle categorie a partire dalla lista piatta.
function buildCategoryTree(categories) {
  const byId = new Map();
  const roots = [];
  categories.forEach((c) =>
    byId.set(c.id, {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image_url: c.image_key ? publicUrl(c.image_key) : null,
      children: [],
    }),
  );
  categories.forEach((c) => {
    const node = byId.get(c.id);
    if (c.parent_id && byId.has(c.parent_id)) byId.get(c.parent_id).children.push(node);
    else roots.push(node);
  });
  return roots;
}

async function getCategoryTree() {
  const categories = await repo.getActiveCategories();
  return buildCategoryTree(categories);
}

async function getCategory(slug) {
  const category = await repo.getCategoryBySlug(slug);
  if (!category) throw AppError.notFound('Categoria non trovata');
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image_url: category.image_key ? publicUrl(category.image_key) : null,
    attributes: (category.attributeDefinitions || []).map((d) => ({
      code: d.code,
      label: d.label,
      data_type: d.data_type,
      unit: d.unit,
      options: d.options,
      is_filterable: d.is_filterable,
    })),
  };
}

async function getBrands() {
  const brands = await repo.getActiveBrands();
  return brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logo_url: b.logo_key ? publicUrl(b.logo_key) : null,
  }));
}

async function listProducts(query) {
  let categoryIds = null;
  if (query.category) {
    categoryIds = await repo.getCategorySubtreeIds(query.category);
    if (!categoryIds.length) throw AppError.notFound('Categoria non trovata');
  }

  let brandId = null;
  if (query.brand) {
    const brand = await db.Brand.findOne({ where: { slug: query.brand } });
    if (!brand) throw AppError.notFound('Brand non trovato');
    brandId = brand.id;
  }

  const { count, rows } = await repo.listProducts({
    q: query.q || null,
    categoryIds,
    brandId,
    condition: query.condition || null,
    featured: query.featured != null ? query.featured : null,
    min_price: query.min_price != null ? query.min_price : null,
    max_price: query.max_price != null ? query.max_price : null,
    sort: query.sort,
    page: query.page,
    limit: query.limit,
  });

  return {
    items: rows.map(serializeProductCard),
    page: query.page,
    limit: query.limit,
    total: count,
    total_pages: Math.ceil(count / query.limit) || 1,
  };
}

async function getProduct(slug) {
  const product = await repo.getProductBySlug(slug);
  if (!product) throw AppError.notFound('Prodotto non trovato');
  return serializeProductDetail(product);
}

module.exports = { getCategoryTree, getCategory, getBrands, listProducts, getProduct };
