'use strict';

// Ordine. Può essere di un utente registrato o guest (user_id null, email
// sempre presente). Gli indirizzi sono congelati come snapshot.
module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    'Order',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      order_number: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      email: { type: DataTypes.STRING(180), allowNull: false },
      status: {
        type: DataTypes.ENUM(
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
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'eur' },
      subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      vat_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      shipping_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      grand_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      shipping_recipient: { type: DataTypes.STRING(160), allowNull: true },
      shipping_line1: { type: DataTypes.STRING(200), allowNull: true },
      shipping_line2: { type: DataTypes.STRING(200), allowNull: true },
      shipping_city: { type: DataTypes.STRING(120), allowNull: true },
      shipping_province: { type: DataTypes.STRING(60), allowNull: true },
      shipping_postal_code: { type: DataTypes.STRING(20), allowNull: true },
      shipping_country: { type: DataTypes.STRING(2), allowNull: true, defaultValue: 'IT' },
      shipping_phone: { type: DataTypes.STRING(30), allowNull: true },
      billing_recipient: { type: DataTypes.STRING(160), allowNull: true },
      billing_line1: { type: DataTypes.STRING(200), allowNull: true },
      billing_line2: { type: DataTypes.STRING(200), allowNull: true },
      billing_city: { type: DataTypes.STRING(120), allowNull: true },
      billing_province: { type: DataTypes.STRING(60), allowNull: true },
      billing_postal_code: { type: DataTypes.STRING(20), allowNull: true },
      billing_country: { type: DataTypes.STRING(2), allowNull: true, defaultValue: 'IT' },
      billing_vat: { type: DataTypes.STRING(20), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      placed_at: { type: DataTypes.DATE, allowNull: true },
      paid_at: { type: DataTypes.DATE, allowNull: true },
      shipped_at: { type: DataTypes.DATE, allowNull: true },
      delivered_at: { type: DataTypes.DATE, allowNull: true },
      cancelled_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'orders', underscored: true, timestamps: true },
  );

  Order.associate = (db) => {
    Order.belongsTo(db.User, { as: 'user', foreignKey: 'user_id' });
    Order.hasMany(db.OrderItem, { as: 'items', foreignKey: 'order_id' });
    Order.hasOne(db.Payment, { as: 'payment', foreignKey: 'order_id' });
    Order.hasOne(db.Invoice, { as: 'invoice', foreignKey: 'order_id' });
  };

  return Order;
};
