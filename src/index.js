const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const mysql = require('mysql2')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')

// Modulos externos con otras rutas
const personal = require('./routes/personal')
const posts = require('./routes/posts')
const teams = require('./routes/teams')
const users = require('./routes/users')

const pool = require('./utils/dbConnection')

const app = express()
app.use(cors())
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())

// midleware para los demás modulos de la aplicación
app.use('/api', personal, posts, teams, users)

const PORT = process.env.port || 3000

dotenv.config()

// Usar el pool para ejecutar consultas
pool
  .getConnection()
  .then((connection) => {
    console.log('Conexión al pool de la base de datos establecida.')
    // No olvides liberar la conexión después de usarla
    connection.release()
  })
  .catch((err) => {
    console.error('Error al conectar al pool de la base de datos:', err)
  })

app.listen(PORT, () => {
  console.log(`Servidor Corriendo en el puerto: ${PORT}`)
})

module.exports = pool
