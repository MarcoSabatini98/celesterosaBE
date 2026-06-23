'use strict';

// Immagine prodotto su MinIO. object_key = chiave oggetto; variant_id la lega
// a una variante specifica (es. il colore), altrimenti è immagine generica.
module.exports = (sequelize, DataTypes) => {
  const ProductImage = sequelize.define(
    'ProductImage',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      variant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      object_key: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      alt: { type: DataTypes.STRING(200), allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'product_images', underscored: true, timestamps: true },
  );

  ProductImage.associate = (db) => {
    ProductImage.belongsTo(db.Product, { as: 'product', foreignKey: 'product_id' });
    ProductImage.belongsTo(db.ProductVariant, { as: 'variant', foreignKey: 'variant_id' });
  };

  return ProductImage;
};
