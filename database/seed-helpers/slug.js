'use strict';

const slugify = require('slugify');

// Slug coerente per categorie/brand/prodotti.
function toSlug(text) {
  return slugify(String(text), { lower: true, strict: true, locale: 'it' });
}

module.exports = { toSlug };
