const mysql = require('mysql2')
const dotenv = require('dotenv')

dotenv.config()

// Conectar con la base de datos
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
})

module.exports = connection
