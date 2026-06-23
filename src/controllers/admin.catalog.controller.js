'use strict';

const asyncHandler = require('../utils/async.handler');
const { sendSuccess } = require('../utils/http.response');
const svc = require('../services/admin.catalog.service');

// Brand
const createBrand = asyncHandler(async (req, res) => sendSuccess(res, 201, await svc.createBrand(req.body)));
const updateBrand = asyncHandler(async (req, res) => sendSuccess(res, 200, await svc.updateBrand(+req.params.id, req.body)));
const deleteBrand = asyncHandler(async (req, res) => { await svc.deleteBrand(+req.params.id); return sendSuccess(res, 200, { deleted: true }); });

// Categorie
const createCategory = asyncHandler(async (req, res) => sendSuccess(res, 201, await svc.createCategory(req.body)));
const updateCategory = asyncHandler(async (req, res) => sendSuccess(res, 200, await svc.updateCategory(+req.params.id, req.body)));
const deleteCategory = asyncHandler(async (req, res) => { await svc.deleteCategory(+req.params.id); return sendSuccess(res, 200, { deleted: true }); });
const createAttributeDefinition = asyncHandler(async (req, res) => sendSuccess(res, 201, await svc.createAttributeDefinition(+req.params.id, req.body)));

// Prodotti
const listProducts = asyncHandler(async (req, res) => sendSuccess(res, 200, await svc.listProducts(req.query)));
const getProduct = asyncHandler(async (req, res) => sendSuccess(res, 200, await svc.getProduct(+req.params.id)));
const createProduct = asyncHandler(async (req, res) => sendSuccess(res, 201, await svc.createProduct(req.body)));
const updateProduct = asyncHandler(async (req, res) => sendSuccess(res, 200, await svc.updateProduct(+req.params.id, req.body)));
const deleteProduct = asyncHandler(async (req, res) => { await svc.deleteProduct(+req.params.id); return sendSuccess(res, 200, { deleted: true }); });
const setAttributes = asyncHandler(async (req, res) => sendSuccess(res, 200, await svc.setAttributes(+req.params.id, req.body.attributes)));

// Varianti
const addVariant = asyncHandler(async (req, res) => sendSuccess(res, 201, await svc.addVariant(+req.params.id, req.body)));
const updateVariant = asyncHandler(async (req, res) => sendSuccess(res, 200, await svc.updateVariant(+req.params.variantId, req.body)));
const deleteVariant = asyncHandler(async (req, res) => { await svc.deleteVariant(+req.params.variantId); return sendSuccess(res, 200, { deleted: true }); });

// Immagini
const addImages = asyncHandler(async (req, res) =>
  sendSuccess(res, 201, await svc.addImages(+req.params.id, req.files, { variantId: req.body.variant_id ? +req.body.variant_id : null })),
);
const deleteImage = asyncHandler(async (req, res) => { await svc.deleteImage(+req.params.imageId); return sendSuccess(res, 200, { deleted: true }); });

module.exports = {
  createBrand, updateBrand, deleteBrand,
  createCategory, updateCategory, deleteCategory, createAttributeDefinition,
  listProducts, getProduct, createProduct, updateProduct, deleteProduct, setAttributes,
  addVariant, updateVariant, deleteVariant,
  addImages, deleteImage,
};
