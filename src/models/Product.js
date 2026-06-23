'use strict';

// Anagrafica prodotto. Campi comuni qui; attributi specifici di categoria in
// ProductAttribute (EAV); articoli acquistabili in ProductVariant.
module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'Product',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      brand_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      sku: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      slug: { type: DataTypes.STRING(220), allowNull: false, unique: true },
      short_description: { type: DataTypes.STRING(500), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      condition: {
        type: DataTypes.ENUM('new', 'used', 'refurbished'),
        allowNull: false,
        defaultValue: 'new',
      },
      base_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      vat_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 22 },
      rating_avg: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
      rating_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      is_featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'products', underscored: true, timestamps: true },
  );

  Product.associate = (db) => {
    Product.belongsTo(db.Category, { as: 'category', foreignKey: 'category_id' });
    Product.belongsTo(db.Brand, { as: 'brand', foreignKey: 'brand_id' });
    Product.hasMany(db.ProductVariant, { as: 'variants', foreignKey: 'product_id' });
    Product.hasMany(db.ProductImage, { as: 'images', foreignKey: 'product_id' });
    Product.hasMany(db.ProductAttribute, { as: 'attributes', foreignKey: 'product_id' });
  };

  return Product;
};
