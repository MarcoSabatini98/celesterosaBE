'use strict';

// Accesso dati ai brand.
const { Brand } = require('../models');

// Tutti i brand attivi, in ordine alfabetico.
function findAllActive() {
  return Brand.findAll({
    where: { is_active: true },
    order: [['name', 'ASC']],
  });
}

module.exports = { findAllActive };
