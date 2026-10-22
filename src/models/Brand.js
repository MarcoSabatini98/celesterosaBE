'use strict';

// Marca/produttore degli strumenti (Fender, Yamaha, Roland...).
module.exports = (sequelize, DataTypes) => {
  const Brand = sequelize.define(
    'Brand',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      logo_key: { type: DataTypes.STRING(255), allowNull: true },
      website: { type: DataTypes.STRING(255), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'brands', underscored: true, timestamps: true },
  );

  Brand.associate = (db) => {
    Brand.hasMany(db.Product, { as: 'products', foreignKey: 'brand_id' });
  };

  return Brand;
};
