require('dotenv').config()

module.exports = {
  development: {
    username: 'root',
    password: process.env.SEQUELIZE_PASSWORD,
    database: 'AlgoHub',
    host: '127.0.0.1',
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4',
      dateStrings: true,
      typeCast: true
    },
    timezone: '+09:00',
    operatorAliases: 'false'
  },
  production: {
    username: 'root',
    password: process.env.SEQUELIZE_PASSWORD,
    database: 'AlgoHub',
    host: '127.0.0.1',
    dialectOptions: {
      charset: 'utf8mb4',
      dateStrings: true,
      typeCast: true
    },
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    timezone: '+09:00',
    operatorAliases: 'false',
    logging: false
  }
}
