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

// Obtener a todo el personal registrado
router.get('/personal', (req, res) => {
  connection.query('SELECT * FROM Personal', (err, results) => {
    if (err) {
      console.log('Error', err)
    }
    res.json(results)
  })
})

// Registrar a alguien dentro del personal
router.post('/personal', (req, res) => {
  const name = req.body.name
  const team = '07289281'
  console.log(req.body.name)

  connection.query(
    'INSERT INTO Personal (personal_id, personal_name, team_id) VALUES (LPAD(FLOOR(RAND() * 100000000), 8, "0"), ?, ?);',
    [name, team],
    (err) => {
      if (err) {
        console.error('Error al insertar en Posts:', err)
        return res.status(500).send('Error al insertar el registro')
      }
      res.json(name)
    }
  )
})

module.exports = router
