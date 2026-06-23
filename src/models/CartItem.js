'use strict';

// Riga di carrello: una variante con quantità e prezzo snapshot.
module.exports = (sequelize, DataTypes) => {
  const CartItem = sequelize.define(
    'CartItem',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      cart_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      product_variant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    },
    { tableName: 'cart_items', underscored: true, timestamps: true },
  );

  CartItem.associate = (db) => {
    CartItem.belongsTo(db.Cart, { as: 'cart', foreignKey: 'cart_id' });
    CartItem.belongsTo(db.ProductVariant, { as: 'variant', foreignKey: 'product_variant_id' });
  };

  return CartItem;
};
