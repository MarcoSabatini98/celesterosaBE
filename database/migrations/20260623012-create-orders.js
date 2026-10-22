'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      order_number: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      // Null per ordini guest; l'email resta sempre valorizzata.
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      email: { type: Sequelize.STRING(180), allowNull: false },
      status: {
        type: Sequelize.ENUM(
          'pending',
          'paid',
          'processing',
          'shipped',
          'delivered',
          'cancelled',
          'refunded',
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'eur' },
      subtotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      vat_total: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      shipping_total: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      grand_total: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      // Indirizzo di spedizione (snapshot).
      shipping_recipient: { type: Sequelize.STRING(160), allowNull: true },
      shipping_line1: { type: Sequelize.STRING(200), allowNull: true },
      shipping_line2: { type: Sequelize.STRING(200), allowNull: true },
      shipping_city: { type: Sequelize.STRING(120), allowNull: true },
      shipping_province: { type: Sequelize.STRING(60), allowNull: true },
      shipping_postal_code: { type: Sequelize.STRING(20), allowNull: true },
      shipping_country: { type: Sequelize.STRING(2), allowNull: true, defaultValue: 'IT' },
      shipping_phone: { type: Sequelize.STRING(30), allowNull: true },
      // Indirizzo di fatturazione (snapshot).
      billing_recipient: { type: Sequelize.STRING(160), allowNull: true },
      billing_line1: { type: Sequelize.STRING(200), allowNull: true },
      billing_line2: { type: Sequelize.STRING(200), allowNull: true },
      billing_city: { type: Sequelize.STRING(120), allowNull: true },
      billing_province: { type: Sequelize.STRING(60), allowNull: true },
      billing_postal_code: { type: Sequelize.STRING(20), allowNull: true },
      billing_country: { type: Sequelize.STRING(2), allowNull: true, defaultValue: 'IT' },
      billing_vat: { type: Sequelize.STRING(20), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      placed_at: { type: Sequelize.DATE, allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      shipped_at: { type: Sequelize.DATE, allowNull: true },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      cancelled_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('orders', ['user_id']);
    await queryInterface.addIndex('orders', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('orders');
  },
};
