// server.js
const app = require('./app');
const { sequelize } = require('./models');
const cfg = require('./config/env');

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true }); 
    app.listen(cfg.port, () => {
      console.log(`API running on ${cfg.baseUrl}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
