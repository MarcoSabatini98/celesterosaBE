'use strict';

// Immagini placeholder per i prodotti: genera un SVG (sfondo per categoria +
// nome prodotto/brand) e lo carica su MinIO, creando il record ProductImage.
//
// Saltato in ambiente di test (NODE_ENV=test): evita dipendenza da MinIO e
// upload ripetuti durante la suite. Idempotente: salta i prodotti che hanno
// già almeno un'immagine.

const db = require('../../src/models');
const storage = require('../../src/utils/storage');

// Palette per dare un colore di sfondo diverso a seconda della categoria.
const PALETTE = ['#1f2937', '#3b0764', '#0f3d3e', '#3f1d2e', '#1e3a5f', '#3d2c00', '#102a43', '#2d1b3d'];

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

function buildSvg({ name, brand, color }) {
  const title = escapeXml(name);
  const sub = escapeXml(brand || 'celesterosa');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="${color}"/>
  <rect x="40" y="40" width="720" height="720" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="2"/>
  <text x="400" y="380" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="bold" text-anchor="middle">${title}</text>
  <text x="400" y="440" fill="#ffffff" fill-opacity="0.7" font-family="Helvetica, Arial, sans-serif" font-size="24" text-anchor="middle">${sub}</text>
  <text x="400" y="720" fill="#ffffff" fill-opacity="0.4" font-family="Helvetica, Arial, sans-serif" font-size="20" text-anchor="middle">celesterosa</text>
</svg>`;
}

module.exports = {
  async up() {
    if (process.env.NODE_ENV === 'test') return; // no-op nei test

    const products = await db.Product.findAll({ include: [{ model: db.Brand, as: 'brand' }] });

    for (const product of products) {
      const already = await db.ProductImage.count({ where: { product_id: product.id } });
      if (already) continue;

      const color = PALETTE[product.category_id % PALETTE.length];
      const svg = buildSvg({ name: product.name, brand: product.brand?.name, color });
      const objectKey = `products/${product.id}/seed-cover.svg`;

      await storage.putObject(objectKey, Buffer.from(svg, 'utf8'), 'image/svg+xml');
      await db.ProductImage.create({
        product_id: product.id,
        object_key: objectKey,
        alt: product.name,
        sort_order: 0,
        is_primary: true,
      });
    }
  },

  async down() {
    // Rimuove solo le immagini placeholder generate da questo seeder.
    const images = await db.ProductImage.findAll({
      where: { object_key: { [db.Sequelize.Op.like]: '%/seed-cover.svg' } },
    });
    await Promise.all(images.map((img) => storage.removeObject(img.object_key).catch(() => {})));
    await db.ProductImage.destroy({ where: { id: images.map((i) => i.id) } });
  },
};
