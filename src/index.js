const express = require('express')
// import express from "express"
const dotenv = require('dotenv')
// import dotenv from "dotenv"
const { createClient } = require('@libsql/client')
// import { createClient } from "@libsql/client"
const cors = require('cors')
// const mysql = require('mysql')
const mysql = require('mysql2')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')

// Modulos externos con otras rutas
const personal = require('./routes/personal')
const posts = require('./routes/posts')
const teams = require('./routes/teams')
const users = require('./routes/users')
const connection = require('./utils/dbConnection')

const app = express()
app.use(cors())
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())

// midleware para los demás modulos de la aplicación
app.use('/api', personal, posts, teams, users)

const PORT = process.env.port || 3000

dotenv.config()
// Conexión con la base de datos
const db = createClient({
  url: 'libsql://positive-screwball-jesuswav.turso.io',
  authToken: process.env.DB_TOKEN,
})

connection.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err)
    setTimeout(connectToDatabase, 2000) // Intentar reconectar después de 2 segundos
  } else {
    console.log('Conexión a la base de datos establecida.')
  }
})

setInterval(() => {
  connection.query('SELECT 1', (err) => {
    if (err) {
      console.error('Error en la consulta de keep-alive:', err)
      connection.end()
      // connectToDatabase() // Reconectar si hay un error en la consulta de keep-alive
    }
  })
}, 30000)

app.listen(PORT, () => {
  console.log(`Servidor Corriendo en el puerto: ${PORT}`)
})

module.exports = connection
