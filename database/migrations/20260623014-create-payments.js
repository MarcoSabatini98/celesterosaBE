'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      order_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      provider: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'stripe' },
      stripe_payment_intent_id: { type: Sequelize.STRING(120), allowNull: true, unique: true },
      stripe_charge_id: { type: Sequelize.STRING(120), allowNull: true },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'eur' },
      status: {
        type: Sequelize.ENUM(
          'requires_payment',
          'processing',
          'succeeded',
          'failed',
          'refunded',
          'canceled',
        ),
        allowNull: false,
        defaultValue: 'requires_payment',
      },
      method: { type: Sequelize.STRING(40), allowNull: true },
      // Ultimo evento Stripe ricevuto (utile per audit/debug del webhook).
      raw_event: { type: Sequelize.JSON, allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('payments', ['order_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payments');
  },
};
