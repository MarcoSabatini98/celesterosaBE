'use strict';

// Utente: cliente (default) o admin. Password salvata come hash bcrypt.
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      email: { type: DataTypes.STRING(180), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      first_name: { type: DataTypes.STRING(80), allowNull: false },
      last_name: { type: DataTypes.STRING(80), allowNull: false },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      role: { type: DataTypes.ENUM('customer', 'admin'), allowNull: false, defaultValue: 'customer' },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      email_verified_at: { type: DataTypes.DATE, allowNull: true },
      last_login_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'users',
      underscored: true,
      timestamps: true,
      defaultScope: { attributes: { exclude: ['password_hash'] } },
      scopes: { withPassword: { attributes: {} } },
    },
  );

  User.associate = (db) => {
    User.hasMany(db.Address, { as: 'addresses', foreignKey: 'user_id' });
    User.hasMany(db.Cart, { as: 'carts', foreignKey: 'user_id' });
    User.hasMany(db.Order, { as: 'orders', foreignKey: 'user_id' });
    User.hasMany(db.Invoice, { as: 'invoices', foreignKey: 'user_id' });
    User.hasMany(db.RefreshToken, { as: 'refreshTokens', foreignKey: 'user_id' });
  };

  return User;
};
