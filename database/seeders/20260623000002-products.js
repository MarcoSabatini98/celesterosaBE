'use strict';

// Seed prodotti demo con varianti e attributi EAV. Idempotente sullo SKU.

const db = require('../../src/models');
const { toSlug } = require('../seed-helpers/slug');
const productsData = require('../seed-helpers/products-data');

// Compone il nome leggibile della variante dai suoi tratti.
function variantName(v) {
  const parts = [v.color, v.finish, v.size, v.handedness === 'left' ? 'Mancina' : null].filter(
    Boolean,
  );
  return parts.length ? parts.join(' / ') : 'Standard';
}

// Imposta il valore EAV nella colonna coerente col tipo dell'attributo.
function eavValue(dataType, raw) {
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

module.exports = {
  // Seeder one-off: complessità ammessa (script di dati, non logica runtime).
  // fallow-ignore-next-line complexity
  async up() {
    for (const p of productsData) {
      const category = await db.Category.findOne({ where: { slug: p.cat } });
      if (!category) throw new Error(`Categoria non trovata: ${p.cat}`);
      const brand = p.brand ? await db.Brand.findOne({ where: { slug: toSlug(p.brand) } }) : null;

      const [product, created] = await db.Product.findOrCreate({
        where: { sku: p.sku },
        defaults: {
          category_id: category.id,
          brand_id: brand ? brand.id : null,
          sku: p.sku,
          name: p.name,
          slug: toSlug(`${p.name}-${p.sku}`),
          short_description: p.short || null,
          description: p.description || null,
          condition: p.condition || 'new',
          base_price: p.base_price,
          vat_rate: p.vat_rate || 22,
          is_featured: !!p.featured,
        },
      });

      if (!created) continue; // già presente: salta varianti/attributi

      // Varianti.
      let i = 1;
      for (const v of p.variants || []) {
        await db.ProductVariant.create({
          product_id: product.id,
          sku: `${p.sku}-${String(i).padStart(2, '0')}`,
          name: variantName(v),
          color: v.color || null,
          finish: v.finish || null,
          handedness: v.handedness || 'na',
          size: v.size || null,
          price: v.price != null ? v.price : null,
          stock: v.stock != null ? v.stock : 0,
          is_default: !!v.is_default,
        });
        i += 1;
      }

      // Attributi EAV.
      const defs = await db.AttributeDefinition.findAll({ where: { category_id: category.id } });
      const defByCode = Object.fromEntries(defs.map((d) => [d.code, d]));
      for (const [code, raw] of Object.entries(p.attrs || {})) {
        const def = defByCode[code];
        if (!def) continue;
        await db.ProductAttribute.create({
          product_id: product.id,
          attribute_definition_id: def.id,
          ...eavValue(def.data_type, raw),
        });
      }
    }
  },

  async down() {
    const skus = productsData.map((p) => p.sku);
    const products = await db.Product.findAll({ where: { sku: skus } });
    const ids = products.map((p) => p.id);
    if (ids.length) {
      await db.ProductAttribute.destroy({ where: { product_id: ids } });
      await db.ProductVariant.destroy({ where: { product_id: ids } });
      await db.ProductImage.destroy({ where: { product_id: ids } });
      await db.Product.destroy({ where: { id: ids } });
    }
  },
};
