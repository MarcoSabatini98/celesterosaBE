'use strict';

// Definizione di un attributo EAV per una categoria: tipo dato, unità di
// misura, opzioni (per gli enum), se è obbligatorio e se è filtrabile.
module.exports = (sequelize, DataTypes) => {
  const AttributeDefinition = sequelize.define(
    'AttributeDefinition',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      code: { type: DataTypes.STRING(80), allowNull: false },
      label: { type: DataTypes.STRING(120), allowNull: false },
      data_type: {
        type: DataTypes.ENUM('string', 'number', 'date', 'boolean', 'enum'),
        allowNull: false,
      },
      options: { type: DataTypes.JSON, allowNull: true },
      unit: { type: DataTypes.STRING(20), allowNull: true },
      is_required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_filterable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'attribute_definitions', underscored: true, timestamps: true },
  );

  AttributeDefinition.associate = (db) => {
    AttributeDefinition.belongsTo(db.Category, { as: 'category', foreignKey: 'category_id' });
    AttributeDefinition.hasMany(db.ProductAttribute, {
      as: 'values',
      foreignKey: 'attribute_definition_id',
    });
  };

  return AttributeDefinition;
};
