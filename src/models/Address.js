'use strict';

// Indirizzo di spedizione o fatturazione salvato in rubrica utente.
module.exports = (sequelize, DataTypes) => {
  const Address = sequelize.define(
    'Address',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      type: { type: DataTypes.ENUM('shipping', 'billing'), allowNull: false, defaultValue: 'shipping' },
      recipient_name: { type: DataTypes.STRING(160), allowNull: false },
      line1: { type: DataTypes.STRING(200), allowNull: false },
      line2: { type: DataTypes.STRING(200), allowNull: true },
      city: { type: DataTypes.STRING(120), allowNull: false },
      province: { type: DataTypes.STRING(60), allowNull: true },
      postal_code: { type: DataTypes.STRING(20), allowNull: false },
      country: { type: DataTypes.STRING(2), allowNull: false, defaultValue: 'IT' },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'addresses', underscored: true, timestamps: true },
  );

  Address.associate = (db) => {
    Address.belongsTo(db.User, { as: 'user', foreignKey: 'user_id' });
  };

  return Address;
};
