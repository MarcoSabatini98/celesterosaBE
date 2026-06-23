'use strict';

// Valore EAV di un attributo per un prodotto. Il valore è memorizzato nella
// colonna tipizzata coerente con AttributeDefinition.data_type.
module.exports = (sequelize, DataTypes) => {
  const ProductAttribute = sequelize.define(
    'ProductAttribute',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      attribute_definition_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      value_string: { type: DataTypes.STRING(255), allowNull: true },
      value_number: { type: DataTypes.DECIMAL(18, 4), allowNull: true },
      value_date: { type: DataTypes.DATEONLY, allowNull: true },
      value_boolean: { type: DataTypes.BOOLEAN, allowNull: true },
    },
    { tableName: 'product_attributes', underscored: true, timestamps: true },
  );

  ProductAttribute.associate = (db) => {
    ProductAttribute.belongsTo(db.Product, { as: 'product', foreignKey: 'product_id' });
    ProductAttribute.belongsTo(db.AttributeDefinition, {
      as: 'definition',
      foreignKey: 'attribute_definition_id',
    });
  };

  return ProductAttribute;
};
