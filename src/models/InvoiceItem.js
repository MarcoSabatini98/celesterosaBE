'use strict';

// Riga di fattura con valori imponibili (IVA esclusa) e relativa imposta.
module.exports = (sequelize, DataTypes) => {
  const InvoiceItem = sequelize.define(
    'InvoiceItem',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      invoice_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      description: { type: DataTypes.STRING(300), allowNull: false },
      quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      vat_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 22 },
      taxable_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      vat_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    },
    { tableName: 'invoice_items', underscored: true, timestamps: true },
  );

  InvoiceItem.associate = (db) => {
    InvoiceItem.belongsTo(db.Invoice, { as: 'invoice', foreignKey: 'invoice_id' });
  };

  return InvoiceItem;
};
