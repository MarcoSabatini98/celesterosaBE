'use strict';

// Accesso dati per User. Isola le query Sequelize dal service.
const { User } = require('../models');

// Cerca per email. includePassword=true usa lo scope withPassword per ottenere
// password_hash (escluso dal defaultScope), necessario in fase di login.
function findByEmail(email, { includePassword = false } = {}) {
  const scoped = includePassword ? User.scope('withPassword') : User;
  return scoped.findOne({ where: { email } });
}

function findById(id) {
  return User.findByPk(id);
}

function create(data, options = {}) {
  return User.create(data, options);
}

function updateLastLogin(user, when = new Date()) {
  return user.update({ last_login_at: when });
}

module.exports = { findByEmail, findById, create, updateLastLogin };
