'use strict';

// Seed clienti demo con rubrica indirizzi. Idempotente sull'email.
const bcrypt = require('bcrypt');
const db = require('../../src/models');
const customers = require('../seed-helpers/customers-data');

module.exports = {
  async up() {
    for (const c of customers) {
      const existing = await db.User.findOne({ where: { email: c.email } });
      if (existing) continue;

      const password_hash = await bcrypt.hash(c.password, 10);
      const user = await db.User.create({
        email: c.email,
        password_hash,
        first_name: c.first_name,
        last_name: c.last_name,
        phone: c.phone || null,
        role: 'customer',
        is_active: true,
        email_verified_at: new Date(),
      });

      for (const a of c.addresses || []) {
        await db.Address.create({ ...a, user_id: user.id });
      }
    }
  },

  async down() {
    const emails = customers.map((c) => c.email);
    const users = await db.User.findAll({ where: { email: emails } });
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await db.Address.destroy({ where: { user_id: ids } });
      await db.User.destroy({ where: { id: ids } });
    }
  },
};
