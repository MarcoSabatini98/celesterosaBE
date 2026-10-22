'use strict';

// Fattura italiana con scomposizione IVA. Dati cedente/cessionario congelati;
// il PDF generato è salvato su MinIO (pdf_key).
module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define(
    'Invoice',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      invoice_number: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      order_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      issue_date: { type: DataTypes.DATEONLY, allowNull: false },
      seller_name: { type: DataTypes.STRING(200), allowNull: false },
      seller_vat: { type: DataTypes.STRING(20), allowNull: false },
      seller_address: { type: DataTypes.STRING(300), allowNull: false },
      customer_name: { type: DataTypes.STRING(200), allowNull: false },
      customer_vat: { type: DataTypes.STRING(20), allowNull: true },
      customer_address: { type: DataTypes.STRING(300), allowNull: true },
      customer_email: { type: DataTypes.STRING(180), allowNull: false },
      taxable_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      vat_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      grand_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'eur' },
      pdf_key: { type: DataTypes.STRING(255), allowNull: true },
      status: { type: DataTypes.ENUM('issued', 'paid', 'void'), allowNull: false, defaultValue: 'issued' },
    },
    { tableName: 'invoices', underscored: true, timestamps: true },
  );

  Invoice.associate = (db) => {
    Invoice.belongsTo(db.Order, { as: 'order', foreignKey: 'order_id' });
    Invoice.belongsTo(db.User, { as: 'user', foreignKey: 'user_id' });
    Invoice.hasMany(db.InvoiceItem, { as: 'items', foreignKey: 'invoice_id' });
  };

  return Invoice;
};
