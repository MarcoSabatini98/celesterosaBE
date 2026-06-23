'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoice_items', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      invoice_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'invoices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      description: { type: Sequelize.STRING(300), allowNull: false },
      quantity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      // Prezzo unitario imponibile (IVA esclusa).
      unit_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      vat_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 22 },
      taxable_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      vat_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('invoice_items', ['invoice_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('invoice_items');
  },
};
