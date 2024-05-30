const express = require('express')
const mysql = require('mysql')
const dotenv = require('dotenv')
const router = express.Router()

dotenv.config()

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
})

router.get('/users', (req, res) => {
  connection.query('SELECT * FROM Personal', (err, results) => {
    if (err) {
      console.error('Error al obtener los datos de Personal', err)
    }
    res.json(Object.values(results))
  })
})

module.exports = router
