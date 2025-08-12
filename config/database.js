// config/database.js
const { Sequelize } = require('sequelize');
const cfg = require('./env');

let sequelize;
if (cfg.db.url) {
  sequelize = new Sequelize(cfg.db.url, { dialect: 'postgres', logging: false });
  console.log('[DB] using DATABASE_URL');
} else {
  sequelize = new Sequelize(cfg.db.name, cfg.db.user, cfg.db.pass, {
    host: cfg.db.host, port: cfg.db.port, dialect: 'postgres', logging: false
  });
  console.log(`[DB] host=${cfg.db.host} db=${cfg.db.name} user=${cfg.db.user}`);
}
module.exports = sequelize;
