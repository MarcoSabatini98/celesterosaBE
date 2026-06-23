'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_variants', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      product_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sku: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(160), allowNull: false },
      color: { type: Sequelize.STRING(60), allowNull: true },
      finish: { type: Sequelize.STRING(60), allowNull: true },
      handedness: {
        type: Sequelize.ENUM('right', 'left', 'na'),
        allowNull: false,
        defaultValue: 'na',
      },
      size: { type: Sequelize.STRING(40), allowNull: true },
      // Prezzo IVA inclusa specifico della variante; null = usa products.base_price.
      price: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      stock: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      weight_grams: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('product_variants', ['product_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_variants');
  },
};
