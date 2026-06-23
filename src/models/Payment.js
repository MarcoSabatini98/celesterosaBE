'use strict';

// Pagamento Stripe associato a un ordine. Lo stato è guidato dai webhook.
module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    'Payment',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      order_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      provider: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'stripe' },
      stripe_payment_intent_id: { type: DataTypes.STRING(120), allowNull: true, unique: true },
      stripe_charge_id: { type: DataTypes.STRING(120), allowNull: true },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'eur' },
      status: {
        type: DataTypes.ENUM(
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
      method: { type: DataTypes.STRING(40), allowNull: true },
      raw_event: { type: DataTypes.JSON, allowNull: true },
      paid_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'payments', underscored: true, timestamps: true },
  );

  Payment.associate = (db) => {
    Payment.belongsTo(db.Order, { as: 'order', foreignKey: 'order_id' });
  };

  return Payment;
};
