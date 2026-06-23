'use strict';

// Carrello. Appartiene a un utente registrato oppure è guest (user_id null,
// identificato dal token opaco salvato lato client).
module.exports = (sequelize, DataTypes) => {
  const Cart = sequelize.define(
    'Cart',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      status: {
        type: DataTypes.ENUM('active', 'converted', 'abandoned'),
        allowNull: false,
        defaultValue: 'active',
      },
    },
    { tableName: 'carts', underscored: true, timestamps: true },
  );

  Cart.associate = (db) => {
    Cart.belongsTo(db.User, { as: 'user', foreignKey: 'user_id' });
    Cart.hasMany(db.CartItem, { as: 'items', foreignKey: 'cart_id' });
  };

  return Cart;
};
