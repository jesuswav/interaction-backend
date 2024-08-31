const mysql = require('mysql2')
const dotenv = require('dotenv')

dotenv.config()

// Crear el pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,  // Número máximo de conexiones
  queueLimit: 0         // No limitar la cola de solicitudes
})

// Exportar el pool para que sea reutilizado en otros archivos
module.exports = pool.promise()  // Utilizamos 'promise' para trabajar con promesas en lugar de callbacks
