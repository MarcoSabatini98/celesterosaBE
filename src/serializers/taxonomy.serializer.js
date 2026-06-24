'use strict';

// Serializer per la gestione admin di marche e categorie. Includono campi non
// esposti al pubblico (is_active) e il conteggio prodotti collegati.
const { mediaUrl } = require('../utils/media');

function toAdminBrand(brand, productCount = 0) {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    description: brand.description ?? null,
    website: brand.website ?? null,
    logo_url: mediaUrl(brand.logo_key),
    is_active: brand.is_active,
    product_count: productCount,
  };
}

function toAdminCategory(category, counts = {}) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
    parent_id: category.parent_id ?? null,
    image_url: mediaUrl(category.image_key),
    sort_order: category.sort_order,
    is_active: category.is_active,
    product_count: counts[category.id] ?? 0,
    children: (category.children || []).map((c) => toAdminCategory(c, counts)),
  };
}

module.exports = { toAdminBrand, toAdminCategory };
