'use strict';

// Controller HTTP del catalogo pubblico. Adatta req/res al service e risponde
// in JSend. Errori async inoltrati all'error handler (Express 5).
const catalogService = require('../services/catalog.service');
const { sendSuccess } = require('../utils/http.response');

async function listCategories(req, res) {
  return sendSuccess(res, 200, await catalogService.categories());
}

async function getCategory(req, res) {
  return sendSuccess(res, 200, await catalogService.category(req.params.slug));
}

async function listBrands(req, res) {
  return sendSuccess(res, 200, await catalogService.brands());
}

async function listProducts(req, res) {
  return sendSuccess(res, 200, await catalogService.products(req.query));
}

async function getProduct(req, res) {
  return sendSuccess(res, 200, await catalogService.product(req.params.slug));
}

module.exports = { listCategories, getCategory, listBrands, listProducts, getProduct };
