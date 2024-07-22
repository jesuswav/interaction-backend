const express = require('express')
const mysql = require('mysql')
const dotenv = require('dotenv')
const router = express.Router()
const jwt = require('jsonwebtoken')

dotenv.config()

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectTimeout: 60000,
})

// Obtener a todo el personal registrado
router.get('/personal', (req, res) => {
  const header_token = req.headers.authorization

  const token = header_token.substring(7)

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' })
    }

    const user_id = user.user_id

    connection.query(
      `
      SELECT 
        Personal.personal_id,
        Personal.personal_name,
        Teams.team_name,
        Teams.team_color
      FROM 
          Personal
      INNER JOIN 
          Teams ON Personal.team_id = Teams.team_id
      WHERE 
          Personal.user_id = ?
    `,
      [user_id],
      (err, results) => {
        if (err) {
          console.log('Error', err)
        }
        res.json(results)
      }
    )
  })
})

// Registrar a alguien dentro del personal
router.post('/personal', (req, res) => {
  const personal_name = req.body.personal_name
  const team_id = req.body.team_id
  const header_token = req.headers.authorization

  const token = header_token.substring(7)

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' })
    }

    const user_id = user.user_id

    connection.query(
      'INSERT INTO Personal (personal_id, personal_name, team_id, user_id) VALUES (LPAD(FLOOR(RAND() * 100000000), 8, "0"), ?, ?, ?)',
      [personal_name, team_id, user_id],
      (err) => {
        if (err) {
          console.error('Error al insertar en Posts:', err)
          return res.status(500).send('Error al insertar el registro')
        }
        res.json(personal_name)
      }
    )
  })
})

module.exports = router
