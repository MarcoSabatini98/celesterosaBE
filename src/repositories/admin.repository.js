'use strict';

// Accesso dati per le operazioni di amministrazione del catalogo: prodotti,
// varianti, immagini (con MinIO) e attributi EAV.
const crypto = require('crypto');
const slugify = require('slugify');
const { Op } = require('sequelize');
const { sequelize } = require('../models');
const {
  Product,
  Brand,
  Category,
  ProductVariant,
  ProductImage,
  ProductAttribute,
  AttributeDefinition,
} = require('../models');
const storage = require('../utils/storage');

function makeSlug(name, sku) {
  return slugify(`${name}-${sku}`, { lower: true, strict: true });
}

// Prodotto completo (tutte le relazioni, anche varianti/immagini non attive):
// la vista admin mostra tutto.
function findFullById(id) {
  return Product.findByPk(id, {
    include: [
      { model: Brand, as: 'brand', attributes: ['id', 'name', 'slug'] },
      { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
      {
        model: ProductVariant,
        as: 'variants',
        separate: true,
        order: [
          ['is_default', 'DESC'],
          ['id', 'ASC'],
        ],
      },
      { model: ProductImage, as: 'images', separate: true, order: [['sort_order', 'ASC']] },
      {
        model: ProductAttribute,
        as: 'attributes',
        separate: true,
        include: [{ model: AttributeDefinition, as: 'definition' }],
      },
    ],
  });
}

// Solo id+count, paginati (la serializzazione full avviene poi per id).
function findProductIds({ q, limit, offset }) {
  const where = {};
  if (q) {
    const like = { [Op.like]: `%${q}%` };
    where[Op.or] = [{ name: like }, { sku: like }];
  }
  return Product.findAndCountAll({
    where,
    attributes: ['id'],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });
}

async function createProduct(data) {
  const product = await Product.create({ ...data, slug: makeSlug(data.name, data.sku) });
  return findFullById(product.id);
}

async function updateProduct(id, data) {
  const product = await Product.findByPk(id);
  if (!product) return null;
  const patch = { ...data };
  // Rigenera lo slug se cambia il nome (o lo sku).
  if (data.name || data.sku) {
    patch.slug = makeSlug(data.name || product.name, data.sku || product.sku);
  }
  await product.update(patch);
  return findFullById(id);
}

// Elimina prodotto e tutto ciò che vi dipende (immagini anche da MinIO).
async function deleteProduct(id) {
  const product = await Product.findByPk(id, {
    include: [{ model: ProductImage, as: 'images' }],
  });
  if (!product) return false;

  await Promise.all(
    (product.images || []).map((img) => storage.removeObject(img.object_key).catch(() => {})),
  );

  await sequelize.transaction(async (transaction) => {
    await ProductAttribute.destroy({ where: { product_id: id }, transaction });
    await ProductImage.destroy({ where: { product_id: id }, transaction });
    await ProductVariant.destroy({ where: { product_id: id }, transaction });
    await Product.destroy({ where: { id }, transaction });
  });
  return true;
}

async function addVariant(productId, data) {
  const product = await Product.findByPk(productId);
  if (!product) return null;
  await ProductVariant.create({ ...data, product_id: productId });
  return findFullById(productId);
}

async function deleteVariant(variantId) {
  const variant = await ProductVariant.findByPk(variantId);
  if (!variant) return null;
  const productId = variant.product_id;
  await variant.destroy();
  return findFullById(productId);
}

// Valore EAV nella colonna tipizzata coerente con la definizione.
function eavColumns(dataType, raw) {
  if (raw == null) return {};
  switch (dataType) {
    case 'number':
      return { value_number: raw };
    case 'boolean':
      return { value_boolean: !!raw };
    case 'date':
      return { value_date: raw };
    default:
      return { value_string: String(raw) };
  }
}

// Sostituisce gli attributi del prodotto con quelli forniti (per code).
async function setAttributes(productId, attributesMap) {
  const product = await Product.findByPk(productId);
  if (!product) return null;

  const defs = await AttributeDefinition.findAll({ where: { category_id: product.category_id } });
  const defByCode = Object.fromEntries(defs.map((d) => [d.code, d]));

  await sequelize.transaction(async (transaction) => {
    await ProductAttribute.destroy({ where: { product_id: productId }, transaction });
    for (const [code, value] of Object.entries(attributesMap)) {
      const def = defByCode[code];
      if (!def || value == null || value === '') continue;
      await ProductAttribute.create(
        { product_id: productId, attribute_definition_id: def.id, ...eavColumns(def.data_type, value) },
        { transaction },
      );
    }
  });
  return findFullById(productId);
}

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

// Carica i file su MinIO e crea i record ProductImage.
async function addImages(productId, files) {
  const product = await Product.findByPk(productId);
  if (!product) return null;

  const existingCount = await ProductImage.count({ where: { product_id: productId } });

  let index = existingCount;
  for (const file of files) {
    const ext = EXT_BY_MIME[file.mimetype] || 'bin';
    const objectKey = `products/${productId}/${crypto.randomUUID()}.${ext}`;
    await storage.putObject(objectKey, file.buffer, file.mimetype);
    await ProductImage.create({
      product_id: productId,
      object_key: objectKey,
      alt: product.name,
      sort_order: index,
      is_primary: index === 0, // la prima immagine in assoluto diventa primaria
    });
    index += 1;
  }
  return findFullById(productId);
}

async function deleteImage(imageId) {
  const image = await ProductImage.findByPk(imageId);
  if (!image) return null;
  const productId = image.product_id;
  await storage.removeObject(image.object_key).catch(() => {});
  await image.destroy();
  return findFullById(productId);
}

module.exports = {
  findFullById,
  findProductIds,
  createProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  deleteVariant,
  setAttributes,
  addImages,
  deleteImage,
};
