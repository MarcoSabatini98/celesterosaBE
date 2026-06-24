'use strict';

// Serializer del catalogo: trasforma i modelli Sequelize nei DTO attesi dal
// frontend (vedi core/models/catalog.models.ts). Si occupa di: rinominare le
// chiavi (image_key/logo_key/object_key → *_url assoluti), convertire i DECIMAL
// (stringhe → number), calcolare campi derivati (price_from, total_stock,
// in_stock) e appiattire i valori EAV.

const { mediaUrl } = require('../utils/media');

// DECIMAL Sequelize arriva come stringa: normalizza a number (o null).
function num(value) {
  return value == null ? null : Number(value);
}

// ── Brand ─────────────────────────────────────────────────────
function toBrand(brand) {
  if (!brand) return null;
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logo_url: mediaUrl(brand.logo_key),
  };
}

// Riferimento sintetico a brand/categoria dentro la scheda prodotto.
function toRef(entity) {
  if (!entity) return null;
  return { id: entity.id, name: entity.name, slug: entity.slug };
}

// ── Categoria ─────────────────────────────────────────────────
function toAttributeDef(def) {
  return {
    code: def.code,
    label: def.label,
    data_type: def.data_type,
    unit: def.unit ?? null,
    options: def.options ?? null,
    is_filterable: def.is_filterable,
  };
}

// Categoria con eventuali figlie annidate (associazione 'children').
function toCategory(category) {
  if (!category) return null;
  const children = category.children || [];
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
    image_url: mediaUrl(category.image_key),
    children: children.map(toCategory),
  };
}

// Dettaglio categoria con le definizioni degli attributi EAV.
function toCategoryDetail(category) {
  if (!category) return null;
  const defs = category.attributeDefinitions || [];
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
    image_url: mediaUrl(category.image_key),
    attributes: defs.map(toAttributeDef),
  };
}

// ── Immagini / varianti / attributi EAV ───────────────────────
function toProductImage(image) {
  return {
    id: image.id,
    url: mediaUrl(image.object_key),
    alt: image.alt ?? null,
    is_primary: image.is_primary,
    variant_id: image.variant_id ?? null,
  };
}

// Prezzo effettivo della variante: il proprio, altrimenti il base_price del
// prodotto.
function variantPrice(variant, basePrice) {
  return variant.price != null ? Number(variant.price) : Number(basePrice);
}

function toVariant(variant, basePrice) {
  const stock = variant.stock ?? 0;
  return {
    id: variant.id,
    sku: variant.sku,
    name: variant.name,
    color: variant.color ?? null,
    finish: variant.finish ?? null,
    handedness: variant.handedness,
    size: variant.size ?? null,
    price: variantPrice(variant, basePrice),
    stock,
    in_stock: stock > 0,
    is_default: variant.is_default,
  };
}

// Appiattisce un valore EAV nella colonna tipizzata coerente.
function eavValue(attr) {
  const type = attr.definition?.data_type;
  switch (type) {
    case 'number':
      return num(attr.value_number);
    case 'boolean':
      return attr.value_boolean;
    case 'date':
      return attr.value_date;
    default:
      return attr.value_string ?? null;
  }
}

function toProductAttributeValue(attr) {
  return {
    code: attr.definition?.code,
    label: attr.definition?.label,
    unit: attr.definition?.unit ?? null,
    value: eavValue(attr),
  };
}

// ── Prodotto: card e dettaglio ────────────────────────────────
// Solo varianti attive concorrono a stock e prezzo minimo.
function activeVariants(product) {
  return (product.variants || []).filter((v) => v.is_active !== false);
}

function priceFrom(product) {
  const variants = activeVariants(product);
  const base = Number(product.base_price);
  if (!variants.length) return base;
  return Math.min(...variants.map((v) => variantPrice(v, base)));
}

function totalStock(product) {
  return activeVariants(product).reduce((sum, v) => sum + (v.stock ?? 0), 0);
}

// Immagine principale: quella marcata is_primary, altrimenti la prima.
function primaryImage(product) {
  const images = product.images || [];
  if (!images.length) return null;
  const primary = images.find((img) => img.is_primary) || images[0];
  return toProductImage(primary);
}

function toProductCard(product) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    short_description: product.short_description ?? null,
    condition: product.condition,
    base_price: Number(product.base_price),
    price_from: priceFrom(product),
    vat_rate: Number(product.vat_rate),
    is_featured: product.is_featured,
    rating_avg: Number(product.rating_avg),
    rating_count: product.rating_count,
    brand: toRef(product.brand),
    category: toRef(product.category),
    primary_image: primaryImage(product),
    total_stock: totalStock(product),
  };
}

function toProductDetail(product) {
  const base = product.base_price;
  const images = (product.images || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(toProductImage);
  const variants = (product.variants || []).map((v) => toVariant(v, base));
  const attributes = (product.attributes || []).map(toProductAttributeValue);

  return {
    ...toProductCard(product),
    description: product.description ?? null,
    images,
    variants,
    attributes,
  };
}

module.exports = {
  toBrand,
  toCategory,
  toCategoryDetail,
  toAttributeDef,
  toProductImage,
  toVariant,
  toProductAttributeValue,
  toProductCard,
  toProductDetail,
};
