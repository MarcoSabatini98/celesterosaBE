'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('addresses', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: { type: Sequelize.ENUM('shipping', 'billing'), allowNull: false, defaultValue: 'shipping' },
      recipient_name: { type: Sequelize.STRING(160), allowNull: false },
      line1: { type: Sequelize.STRING(200), allowNull: false },
      line2: { type: Sequelize.STRING(200), allowNull: true },
      city: { type: Sequelize.STRING(120), allowNull: false },
      province: { type: Sequelize.STRING(60), allowNull: true },
      postal_code: { type: Sequelize.STRING(20), allowNull: false },
      country: { type: Sequelize.STRING(2), allowNull: false, defaultValue: 'IT' },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('addresses', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('addresses');
  },
};
