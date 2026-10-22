'use strict';

// Controller HTTP dell'area admin. Risponde in JSend; errori async inoltrati
// all'error handler (Express 5).
const adminService = require('../services/admin.service');
const { sendSuccess } = require('../utils/http.response');

// Prodotti
async function listProducts(req, res) {
  return sendSuccess(res, 200, await adminService.listProducts(req.query));
}
async function getProduct(req, res) {
  return sendSuccess(res, 200, await adminService.getProduct(req.params.id));
}
async function createProduct(req, res) {
  return sendSuccess(res, 201, await adminService.createProduct(req.body));
}
async function updateProduct(req, res) {
  return sendSuccess(res, 200, await adminService.updateProduct(req.params.id, req.body));
}
async function deleteProduct(req, res) {
  return sendSuccess(res, 200, await adminService.deleteProduct(req.params.id));
}
async function setAttributes(req, res) {
  return sendSuccess(res, 200, await adminService.setAttributes(req.params.id, req.body.attributes));
}

// Varianti
async function addVariant(req, res) {
  return sendSuccess(res, 201, await adminService.addVariant(req.params.productId, req.body));
}
async function deleteVariant(req, res) {
  return sendSuccess(res, 200, await adminService.deleteVariant(req.params.variantId));
}

// Immagini
async function addImages(req, res) {
  return sendSuccess(res, 201, await adminService.addImages(req.params.productId, req.files));
}
async function deleteImage(req, res) {
  return sendSuccess(res, 200, await adminService.deleteImage(req.params.imageId));
}

// Ordini
async function listOrders(req, res) {
  return sendSuccess(res, 200, await adminService.listOrders(req.query));
}
async function updateOrderStatus(req, res) {
  return sendSuccess(
    res,
    200,
    await adminService.updateOrderStatus(req.params.orderNumber, req.body.status),
  );
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  setAttributes,
  addVariant,
  deleteVariant,
  addImages,
  deleteImage,
  listOrders,
  updateOrderStatus,
};
