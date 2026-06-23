'use strict';

// Accesso dati per gli utenti. Isola le query Sequelize dai service.

const db = require('../models');

function findByEmail(email, { withPassword = false } = {}) {
  const scoped = withPassword ? db.User.scope('withPassword') : db.User;
  return scoped.findOne({ where: { email } });
}

function findById(id) {
  return db.User.findByPk(id);
}

function create(data) {
  return db.User.create(data);
}

function updateLastLogin(user) {
  user.last_login_at = new Date();
  return user.save();
}

module.exports = { findByEmail, findById, create, updateLastLogin };
