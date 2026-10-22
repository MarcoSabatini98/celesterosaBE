'use strict';

// Caricatore modelli Sequelize. Importa automaticamente ogni file *.js di
// questa cartella (escluso index.js), registra il modello e poi esegue le
// associazioni dichiarate tramite la funzione statica `associate`.

const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const db = {};
const basename = path.basename(__filename);

fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file !== basename && file.endsWith('.js') && !file.endsWith('.test.js'),
  )
  .forEach((file) => {
    const modelDef = require(path.join(__dirname, file));
    if (typeof modelDef !== 'function') return;
    const model = modelDef(sequelize, DataTypes);
    db[model.name] = model;
  });

Object.values(db).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
