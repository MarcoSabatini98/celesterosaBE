'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_attributes', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      product_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      attribute_definition_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'attribute_definitions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      value_string: { type: Sequelize.STRING(255), allowNull: true },
      value_number: { type: Sequelize.DECIMAL(18, 4), allowNull: true },
      value_date: { type: Sequelize.DATEONLY, allowNull: true },
      value_boolean: { type: Sequelize.BOOLEAN, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('product_attributes', ['product_id', 'attribute_definition_id'], {
      unique: true,
      name: 'uq_product_attr',
    });
    await queryInterface.addIndex('product_attributes', ['attribute_definition_id', 'value_string'], {
      name: 'idx_product_attr_filter',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_attributes');
  },
};
