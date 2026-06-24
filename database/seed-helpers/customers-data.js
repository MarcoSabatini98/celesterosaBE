'use strict';

// Clienti demo con rubrica indirizzi. Password di sviluppo (da non usare in
// produzione). Consumati dal seeder clienti & indirizzi.

module.exports = [
  {
    email: 'giulia.bianchi@example.com',
    password: 'Cliente123!',
    first_name: 'Giulia',
    last_name: 'Bianchi',
    phone: '3401112233',
    addresses: [
      {
        type: 'shipping',
        recipient_name: 'Giulia Bianchi',
        line1: 'Via Garibaldi 12',
        city: 'Milano',
        province: 'MI',
        postal_code: '20121',
        country: 'IT',
        phone: '3401112233',
        is_default: true,
      },
      {
        type: 'billing',
        recipient_name: 'Giulia Bianchi',
        line1: 'Via Garibaldi 12',
        city: 'Milano',
        province: 'MI',
        postal_code: '20121',
        country: 'IT',
        is_default: true,
      },
    ],
  },
  {
    email: 'luca.verdi@example.com',
    password: 'Cliente123!',
    first_name: 'Luca',
    last_name: 'Verdi',
    phone: '3402223344',
    addresses: [
      {
        type: 'shipping',
        recipient_name: 'Luca Verdi',
        line1: 'Corso Vittorio Emanuele 45',
        line2: 'Scala B, int. 7',
        city: 'Torino',
        province: 'TO',
        postal_code: '10123',
        country: 'IT',
        phone: '3402223344',
        is_default: true,
      },
    ],
  },
  {
    email: 'sara.neri@example.com',
    password: 'Cliente123!',
    first_name: 'Sara',
    last_name: 'Neri',
    phone: '3403334455',
    addresses: [
      {
        type: 'shipping',
        recipient_name: 'Sara Neri',
        line1: 'Via Toledo 200',
        city: 'Napoli',
        province: 'NA',
        postal_code: '80134',
        country: 'IT',
        phone: '3403334455',
        is_default: true,
      },
    ],
  },
  {
    email: 'marco.ferrari@example.com',
    password: 'Cliente123!',
    first_name: 'Marco',
    last_name: 'Ferrari',
    phone: '3404445566',
    addresses: [
      {
        type: 'shipping',
        recipient_name: 'Studio Ferrari S.r.l.',
        line1: 'Viale dei Mille 8',
        city: 'Bologna',
        province: 'BO',
        postal_code: '40121',
        country: 'IT',
        phone: '3404445566',
        is_default: true,
      },
      {
        type: 'billing',
        recipient_name: 'Studio Ferrari S.r.l.',
        line1: 'Viale dei Mille 8',
        city: 'Bologna',
        province: 'BO',
        postal_code: '40121',
        country: 'IT',
        is_default: true,
      },
    ],
  },
];
