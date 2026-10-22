'use strict';

// Variante acquistabile del prodotto (finitura/colore, mancino/destro,
// taglia). Ha SKU, stock e prezzo propri; price null = usa product.base_price.
module.exports = (sequelize, DataTypes) => {
  const ProductVariant = sequelize.define(
    'ProductVariant',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      sku: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(160), allowNull: false },
      color: { type: DataTypes.STRING(60), allowNull: true },
      finish: { type: DataTypes.STRING(60), allowNull: true },
      handedness: { type: DataTypes.ENUM('right', 'left', 'na'), allowNull: false, defaultValue: 'na' },
      size: { type: DataTypes.STRING(40), allowNull: true },
      price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      stock: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      weight_grams: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'product_variants', underscored: true, timestamps: true },
  );

  ProductVariant.associate = (db) => {
    ProductVariant.belongsTo(db.Product, { as: 'product', foreignKey: 'product_id' });
    ProductVariant.hasMany(db.ProductImage, { as: 'images', foreignKey: 'variant_id' });
    ProductVariant.hasMany(db.CartItem, { as: 'cartItems', foreignKey: 'product_variant_id' });
    ProductVariant.hasMany(db.OrderItem, { as: 'orderItems', foreignKey: 'product_variant_id' });
  };

  return ProductVariant;
};
