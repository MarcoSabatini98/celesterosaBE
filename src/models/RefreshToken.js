'use strict';

// Refresh token persistito per la rotazione e la revoca. Si memorizza solo
// l'hash del token (token_hash), non il valore in chiaro consegnato al client.
module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define(
    'RefreshToken',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      user_agent: { type: DataTypes.STRING(255), allowNull: true },
      ip: { type: DataTypes.STRING(45), allowNull: true },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      revoked_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'refresh_tokens', underscored: true, timestamps: true },
  );

  // Valido = non revocato e non scaduto.
  RefreshToken.prototype.isActive = function isActive() {
    return this.revoked_at == null && new Date(this.expires_at).getTime() > Date.now();
  };

  RefreshToken.associate = (db) => {
    RefreshToken.belongsTo(db.User, { as: 'user', foreignKey: 'user_id' });
  };

  return RefreshToken;
};
