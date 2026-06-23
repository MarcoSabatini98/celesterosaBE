'use strict';

// Seed utenti: un admin e un cliente demo. Le password sono di sviluppo —
// vanno cambiate in produzione. Idempotente sull'email.

const bcrypt = require('bcrypt');
const db = require('../../src/models');

const USERS = [
  {
    email: 'admin@celesterosa.it',
    password: 'Admin123!',
    first_name: 'Admin',
    last_name: 'celesterosa',
    role: 'admin',
  },
  {
    email: 'cliente@example.com',
    password: 'Cliente123!',
    first_name: 'Mario',
    last_name: 'Rossi',
    role: 'customer',
  },
];

module.exports = {
  async up() {
    for (const u of USERS) {
      const existing = await db.User.findOne({ where: { email: u.email } });
      if (existing) continue;
      const password_hash = await bcrypt.hash(u.password, 10);
      await db.User.create({
        email: u.email,
        password_hash,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
        is_active: true,
        email_verified_at: new Date(),
      });
    }
  },

  async down() {
    await db.User.destroy({ where: { email: USERS.map((u) => u.email) } });
  },
};
