'use strict';

// Logica del catalogo pubblico: categorie, brand e prodotti (listato + dettaglio).
// Restituisce DTO già pronti per il frontend.

const AppError = require('../errors/AppError');
const categoryRepository = require('../repositories/category.repository');
const brandRepository = require('../repositories/brand.repository');
const productRepository = require('../repositories/product.repository');
const { parsePagination, toPaginated } = require('../utils/pagination');
const {
  toCategory,
  toCategoryDetail,
  toBrand,
  toProductCard,
  toProductDetail,
} = require('../serializers/catalog.serializer');

// Albero categorie (top-level con figlie).
async function categories() {
  const tree = await categoryRepository.findTree();
  return tree.map(toCategory);
}

// Dettaglio categoria per slug (con attributi EAV definiti).
async function category(slug) {
  const found = await categoryRepository.findBySlug(slug);
  if (!found) throw AppError.notFound('Categoria non trovata');
  return toCategoryDetail(found);
}

// Elenco brand attivi.
async function brands() {
  const list = await brandRepository.findAllActive();
  return list.map(toBrand);
}

// Listato prodotti filtrato e paginato. La query è già normalizzata dal
// validator (numeri/boolean convertiti, default applicati).
async function products(query = {}) {
  const pagination = parsePagination(query);

  let categoryIds;
  if (query.category) {
    categoryIds = await categoryRepository.findSelfAndChildrenIds(query.category);
    // Categoria inesistente → risultato vuoto coerente (non un errore).
    if (!categoryIds.length) return toPaginated([], 0, pagination);
  }

  const { rows, count } = await productRepository.findAndCount({
    filters: query,
    categoryIds,
    pagination,
    sort: query.sort,
  });

  return toPaginated(rows.map(toProductCard), count, pagination);
}

// Dettaglio prodotto per slug.
async function product(slug) {
  const found = await productRepository.findBySlug(slug);
  if (!found) throw AppError.notFound('Prodotto non trovato');
  return toProductDetail(found);
}

module.exports = { categories, category, brands, products, product };
