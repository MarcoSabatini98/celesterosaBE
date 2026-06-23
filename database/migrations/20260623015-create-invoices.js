'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoices', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      invoice_number: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      order_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      issue_date: { type: Sequelize.DATEONLY, allowNull: false },
      // Dati cedente (negozio), snapshot dalla config.
      seller_name: { type: Sequelize.STRING(200), allowNull: false },
      seller_vat: { type: Sequelize.STRING(20), allowNull: false },
      seller_address: { type: Sequelize.STRING(300), allowNull: false },
      // Dati cessionario (cliente).
      customer_name: { type: Sequelize.STRING(200), allowNull: false },
      customer_vat: { type: Sequelize.STRING(20), allowNull: true },
      customer_address: { type: Sequelize.STRING(300), allowNull: true },
      customer_email: { type: Sequelize.STRING(180), allowNull: false },
      // Totali fiscali.
      taxable_total: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      vat_total: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      grand_total: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'eur' },
      // Chiave del PDF su MinIO (null finché non generato).
      pdf_key: { type: Sequelize.STRING(255), allowNull: true },
      status: {
        type: Sequelize.ENUM('issued', 'paid', 'void'),
        allowNull: false,
        defaultValue: 'issued',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('invoices', ['order_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('invoices');
  },
};
