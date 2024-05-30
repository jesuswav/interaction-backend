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

router.post('/users', (req, res) => {
  connection.query(
    'INSERT INTO Personal (personal_id, personal_name, team_id) VALUES (LPAD(FLOOR(RAND() * 100000000), 8, "0"), ?, "07289281");'
  )
})

router.delete('/users', (req, res) => {
  const personal_id = req.query.personal_id

  connection.query(
    'DELETE FROM Personal WHERE personal_id = ?',
    [personal_id],
    (err) => {
      if (err) {
        console.error('Error al borrar el registro ', err)
      }
      res.send('Resultado borrado exitosamente')
    }
  )
})
module.exports = router
