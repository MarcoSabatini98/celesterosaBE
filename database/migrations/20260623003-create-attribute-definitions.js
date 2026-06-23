'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attribute_definitions', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      category_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      code: { type: Sequelize.STRING(80), allowNull: false },
      label: { type: Sequelize.STRING(120), allowNull: false },
      data_type: {
        type: Sequelize.ENUM('string', 'number', 'date', 'boolean', 'enum'),
        allowNull: false,
      },
      options: { type: Sequelize.JSON, allowNull: true },
      unit: { type: Sequelize.STRING(20), allowNull: true },
      is_required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_filterable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('attribute_definitions', ['category_id', 'code'], {
      unique: true,
      name: 'uq_attr_def_category_code',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('attribute_definitions');
  },
};
