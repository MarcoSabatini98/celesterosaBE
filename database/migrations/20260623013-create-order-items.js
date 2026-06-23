'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_items', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      order_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // Riferimento alla variante (può diventare null se cancellata a catalogo):
      // i dati di riga sono comunque congelati nei campi snapshot sottostanti.
      product_variant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'product_variants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      product_name: { type: Sequelize.STRING(200), allowNull: false },
      variant_name: { type: Sequelize.STRING(160), allowNull: true },
      sku: { type: Sequelize.STRING(64), allowNull: false },
      // Prezzo IVA inclusa, quantità e scomposizione fiscale di riga.
      unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      quantity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      vat_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 22 },
      line_taxable: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      line_vat: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      line_total: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('order_items', ['order_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_items');
  },
};
