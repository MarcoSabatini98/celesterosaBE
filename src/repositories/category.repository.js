'use strict';

// Accesso dati alle categorie del catalogo.
const { Category, AttributeDefinition } = require('../models');

// Albero delle categorie: top-level attive con le figlie attive annidate,
// ordinate per sort_order.
function findTree() {
  return Category.findAll({
    where: { parent_id: null, is_active: true },
    order: [
      ['sort_order', 'ASC'],
      ['name', 'ASC'],
      [{ model: Category, as: 'children' }, 'sort_order', 'ASC'],
    ],
    include: [
      {
        model: Category,
        as: 'children',
        required: false,
        where: { is_active: true },
      },
    ],
  });
}

// Categoria per slug con le definizioni degli attributi EAV (per il dettaglio).
function findBySlug(slug) {
  return Category.findOne({
    where: { slug, is_active: true },
    include: [
      {
        model: AttributeDefinition,
        as: 'attributeDefinitions',
        required: false,
        separate: true,
        order: [['sort_order', 'ASC']],
      },
    ],
  });
}

// id della categoria + delle sue figlie dirette, per filtrare i prodotti anche
// quando si seleziona una categoria padre. Array vuoto se lo slug non esiste.
async function findSelfAndChildrenIds(slug) {
  const category = await Category.findOne({
    where: { slug, is_active: true },
    include: [{ model: Category, as: 'children', attributes: ['id'], required: false }],
  });
  if (!category) return [];
  return [category.id, ...(category.children || []).map((c) => c.id)];
}

module.exports = { findTree, findBySlug, findSelfAndChildrenIds };
