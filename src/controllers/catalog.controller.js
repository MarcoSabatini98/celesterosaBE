'use strict';

const asyncHandler = require('../utils/async.handler');
const { sendSuccess } = require('../utils/http.response');
const catalog = require('../services/catalog.service');

const categories = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, await catalog.getCategoryTree()),
);

const category = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, await catalog.getCategory(req.params.slug)),
);

const brands = asyncHandler(async (req, res) => sendSuccess(res, 200, await catalog.getBrands()));

const products = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, await catalog.listProducts(req.query)),
);

const product = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, await catalog.getProduct(req.params.slug)),
);

module.exports = { categories, category, brands, products, product };
