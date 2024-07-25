const express = require('express')
const dotenv = require('dotenv')
const router = express.Router()
const jwt = require('jsonwebtoken')
const connection = require('../utils/dbConnection')

dotenv.config()

router.get('/teams', (req, res) => {
  const header_token = req.headers.authorization

  const token = header_token.substring(7)

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' })
    }

    const user_id = user.user_id

    connection.query(
      'SELECT * FROM Teams WHERE user_id = ?',
      [user_id],
      (err, results) => {
        if (err) {
          console.error('Error al obtener los Equipos', err)
        }

        let teams = []

        if (results.length === 0) {
          console.log('There are no users')
          return res.json(teams)
        } else {
          results.map((item) => {
            teams.push({
              value: item.team_id,
              label: item.team_name,
              color: item.team_color,
            })
          })

          res.json(Object.values(teams))
        }
      }
    )
  })
})

router.post('/teams', (req, res) => {
  const team_name = req.body.team_name
  const team_color = req.body.team_color
  const user_token = req.headers.authorization

  const token_ready = user_token.substring(7)

  console.log(token_ready)

  jwt.verify(token_ready, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' })
    }

    const user_id = user.user_id

    connection.query(
      'INSERT INTO Teams (team_id, team_name, team_color, user_id) VALUES (LPAD(FLOOR(RAND() * 100000000), 8, "0"), ?, ?, ?)',
      [team_name, team_color, user_id],
      (err) => {
        if (err) {
          console.error('Error al registrar el equipo: ', err)
        }
        res.send('Equipo registrado exitosamente')
      }
    )
  })
})

router.delete('/teams', (req, res) => {
  const team_id = req.body.team_id

  connection.query('DELETE FROM Teams WHERE team_id = ?', [team_id], (err) => {
    if (err) {
      console.error('Error al eliminar el Equipo: ', err)
    }
    res.send(Object.values({ team_id }))
  })
})

module.exports = router
