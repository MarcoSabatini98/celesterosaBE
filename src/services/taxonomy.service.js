'use strict';

// Logica admin per marche e categorie: CRUD, logo/immagine e blocco
// eliminazione quando ci sono prodotti/sottocategorie collegati.
const AppError = require('../errors/AppError');
const repo = require('../repositories/taxonomy.repository');
const { toAdminBrand, toAdminCategory } = require('../serializers/taxonomy.serializer');

// ── Marche ────────────────────────────────────────────────────
async function listBrands() {
  const [brands, counts] = await Promise.all([repo.findAllBrands(), repo.brandProductCounts()]);
  return brands.map((b) => toAdminBrand(b, counts[b.id] ?? 0));
}

async function createBrand(input) {
  return toAdminBrand(await repo.createBrand(input));
}

async function updateBrand(id, input) {
  const brand = await repo.updateBrand(id, input);
  if (!brand) throw AppError.notFound('Marca non trovata');
  return toAdminBrand(brand);
}

async function deleteBrand(id) {
  const res = await repo.deleteBrand(id);
  if (res.status === 'notfound') throw AppError.notFound('Marca non trovata');
  if (res.status === 'inuse') {
    throw AppError.conflict(
      `Marca usata da ${res.count} prodotti: disattivala invece di eliminarla`,
    );
  }
  return { deleted: true, id: Number(id) };
}

async function setBrandLogo(id, file) {
  if (!file) throw AppError.unprocessable('Nessun logo caricato');
  const brand = await repo.setBrandLogo(id, file);
  if (!brand) throw AppError.notFound('Marca non trovata');
  return toAdminBrand(brand);
}

// ── Categorie ─────────────────────────────────────────────────
async function listCategories() {
  const [tree, counts] = await Promise.all([
    repo.findAllCategoriesTree(),
    repo.categoryProductCounts(),
  ]);
  return tree.map((c) => toAdminCategory(c, counts));
}

async function createCategory(input) {
  return toAdminCategory(await repo.createCategory(input));
}

async function updateCategory(id, input) {
  const category = await repo.updateCategory(id, input);
  if (!category) throw AppError.notFound('Categoria non trovata');
  return toAdminCategory(category);
}

async function deleteCategory(id) {
  const res = await repo.deleteCategory(id);
  if (res.status === 'notfound') throw AppError.notFound('Categoria non trovata');
  if (res.status === 'haschildren') {
    throw AppError.conflict(
      `Categoria con ${res.count} sottocategorie: elimina o sposta prima le sottocategorie`,
    );
  }
  if (res.status === 'inuse') {
    throw AppError.conflict(
      `Categoria usata da ${res.count} prodotti: disattivala invece di eliminarla`,
    );
  }
  return { deleted: true, id: Number(id) };
}

async function setCategoryImage(id, file) {
  if (!file) throw AppError.unprocessable('Nessuna immagine caricata');
  const category = await repo.setCategoryImage(id, file);
  if (!category) throw AppError.notFound('Categoria non trovata');
  return toAdminCategory(category);
}

module.exports = {
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  setBrandLogo,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  setCategoryImage,
};
