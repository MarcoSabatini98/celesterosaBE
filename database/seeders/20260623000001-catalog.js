'use strict';

// Seed del catalogo di base: brand, tassonomia categorie e attributi EAV.
// Idempotente: usa findOrCreate sugli slug/codici.

const db = require('../../src/models');
const { toSlug } = require('../seed-helpers/slug');
const { brands, taxonomy } = require('../seed-helpers/catalog-data');

const TYPE = { s: 'string', n: 'number', d: 'date', b: 'boolean', e: 'enum' };

async function seedAttributes(categoryId, attrs = []) {
  let sort = 0;
  for (const a of attrs) {
    await db.AttributeDefinition.findOrCreate({
      where: { category_id: categoryId, code: a.code },
      defaults: {
        category_id: categoryId,
        code: a.code,
        label: a.label,
        data_type: TYPE[a.t] || 'string',
        options: a.options ? a.options : null,
        unit: a.unit || null,
        is_required: !!a.r,
        is_filterable: !!a.f,
        sort_order: sort++,
      },
    });
  }
}

module.exports = {
  async up() {
    // Brand.
    for (const b of brands) {
      await db.Brand.findOrCreate({
        where: { slug: toSlug(b.name) },
        defaults: { name: b.name, slug: toSlug(b.name), website: b.website || null },
      });
    }

    // Categorie top-level + figlie + attributi.
    let topSort = 0;
    for (const top of taxonomy) {
      const [parent] = await db.Category.findOrCreate({
        where: { slug: toSlug(top.name) },
        defaults: {
          name: top.name,
          slug: toSlug(top.name),
          description: top.description || null,
          parent_id: null,
          sort_order: topSort++,
        },
      });

      let childSort = 0;
      for (const child of top.children || []) {
        const [sub] = await db.Category.findOrCreate({
          where: { slug: toSlug(child.name) },
          defaults: {
            name: child.name,
            slug: toSlug(child.name),
            parent_id: parent.id,
            sort_order: childSort++,
          },
        });
        await seedAttributes(sub.id, child.attrs);
      }
    }
  },

  async down() {
    await db.ProductAttribute.destroy({ where: {}, truncate: false });
    await db.AttributeDefinition.destroy({ where: {} });
    await db.Category.destroy({ where: {} });
    await db.Brand.destroy({ where: {} });
  },
};
