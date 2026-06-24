'use strict';

// Controller HTTP per la gestione admin di marche e categorie. JSend; errori
// async inoltrati all'error handler (Express 5).
const service = require('../services/taxonomy.service');
const { sendSuccess } = require('../utils/http.response');

// Marche
async function listBrands(req, res) {
  return sendSuccess(res, 200, await service.listBrands());
}
async function createBrand(req, res) {
  return sendSuccess(res, 201, await service.createBrand(req.body));
}
async function updateBrand(req, res) {
  return sendSuccess(res, 200, await service.updateBrand(req.params.id, req.body));
}
async function deleteBrand(req, res) {
  return sendSuccess(res, 200, await service.deleteBrand(req.params.id));
}
async function setBrandLogo(req, res) {
  return sendSuccess(res, 200, await service.setBrandLogo(req.params.id, req.file));
}

// Categorie
async function listCategories(req, res) {
  return sendSuccess(res, 200, await service.listCategories());
}
async function createCategory(req, res) {
  return sendSuccess(res, 201, await service.createCategory(req.body));
}
async function updateCategory(req, res) {
  return sendSuccess(res, 200, await service.updateCategory(req.params.id, req.body));
}
async function deleteCategory(req, res) {
  return sendSuccess(res, 200, await service.deleteCategory(req.params.id));
}
async function setCategoryImage(req, res) {
  return sendSuccess(res, 200, await service.setCategoryImage(req.params.id, req.file));
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
