'use strict';

// Refresh token persistiti (rotazione + revoca). Si salva solo l'hash SHA-256
// del token, mai il valore in chiaro: in caso di leak del DB i token restano
// inutilizzabili.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      token_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      user_agent: { type: Sequelize.STRING(255), allowNull: true },
      ip: { type: Sequelize.STRING(45), allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('refresh_tokens', ['user_id']);
    await queryInterface.addIndex('refresh_tokens', ['expires_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
  },
};
