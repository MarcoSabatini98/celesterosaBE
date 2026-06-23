'use strict';

// Categoria del catalogo, gerarchica (parent_id self-reference). Ogni
// categoria definisce — tramite AttributeDefinition — gli attributi EAV dei
// suoi prodotti (es. n. corde per le chitarre, tonalità per i fiati).
module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define(
    'Category',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      parent_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      image_key: { type: DataTypes.STRING(255), allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'categories', underscored: true, timestamps: true },
  );

  Category.associate = (db) => {
    Category.belongsTo(db.Category, { as: 'parent', foreignKey: 'parent_id' });
    Category.hasMany(db.Category, { as: 'children', foreignKey: 'parent_id' });
    Category.hasMany(db.AttributeDefinition, { as: 'attributeDefinitions', foreignKey: 'category_id' });
    Category.hasMany(db.Product, { as: 'products', foreignKey: 'category_id' });
  };

  return Category;
};
