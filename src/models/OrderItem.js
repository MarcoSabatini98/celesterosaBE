'use strict';

// Riga d'ordine con dati prodotto congelati (snapshot) e scomposizione fiscale.
module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define(
    'OrderItem',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      order_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      product_variant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      product_name: { type: DataTypes.STRING(200), allowNull: false },
      variant_name: { type: DataTypes.STRING(160), allowNull: true },
      sku: { type: DataTypes.STRING(64), allowNull: false },
      unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      vat_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 22 },
      line_taxable: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      line_vat: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      line_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    },
    { tableName: 'order_items', underscored: true, timestamps: true },
  );

  OrderItem.associate = (db) => {
    OrderItem.belongsTo(db.Order, { as: 'order', foreignKey: 'order_id' });
    OrderItem.belongsTo(db.ProductVariant, { as: 'variant', foreignKey: 'product_variant_id' });
  };

  return OrderItem;
};
