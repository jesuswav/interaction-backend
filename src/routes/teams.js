const express = require('express')
const dotenv = require('dotenv')
const router = express.Router()
const jwt = require('jsonwebtoken')
const pool = require('../utils/dbConnection')

dotenv.config()

router.get('/teams', async (req, res) => {
  const header_token = req.headers.authorization

  if (!header_token || !header_token.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' })
  }

  const token = header_token.substring(7)

  try {
    // Verificar el token JWT
    const user = await new Promise((resolve, reject) => {
      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
          return reject(err)
        }
        resolve(decoded)
      })
    })

    const user_id = user.user_id

    // Obtener los equipos del usuario
    const [results] = await pool.query(
      'SELECT * FROM Teams WHERE user_id = ?',
      [user_id]
    )

    let teams = []

    if (results.length === 0) {
      console.log('There are no teams for this user')
    } else {
      teams = results.map((item) => ({
        value: item.team_id,
        label: item.team_name,
        color: item.team_color,
      }))
    }

    res.json(teams)
  } catch (err) {
    console.error('Error al obtener los Equipos', err)
    res
      .status(500)
      .json({ message: 'Error al obtener los equipos', error: err })
  }
})

router.post('/teams', async (req, res) => {
  const team_name = req.body.team_name
  const team_color = req.body.team_color
  const user_token = req.headers.authorization

  if (!user_token || !user_token.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' })
  }

  const token_ready = user_token.substring(7)

  try {
    // Verificar el token JWT
    const user = await new Promise((resolve, reject) => {
      jwt.verify(token_ready, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
          return reject(err)
        }
        resolve(decoded)
      })
    })

    const user_id = user.user_id

    // Insertar el nuevo equipo
    await pool.query(
      'INSERT INTO Teams (team_id, team_name, team_color, user_id) VALUES (LPAD(FLOOR(RAND() * 100000000), 8, "0"), ?, ?, ?)',
      [team_name, team_color, user_id]
    )

    res.send('Equipo registrado exitosamente')
  } catch (err) {
    console.error('Error al registrar el equipo: ', err)
    res
      .status(500)
      .json({ message: 'Error al registrar el equipo', error: err })
  }
})

router.delete('/teams', async (req, res) => {
  const team_id = req.body.team_id

  if (!team_id) {
    return res.status(400).json({ message: 'Team ID is required' })
  }

  try {
    // Eliminar el equipo de la base de datos
    await pool.query('DELETE FROM Teams WHERE team_id = ?', [team_id])

    // Enviar respuesta exitosa
    res.json({ team_id })
  } catch (err) {
    console.error('Error al eliminar el Equipo: ', err)
    res.status(500).json({ message: 'Error al eliminar el equipo', error: err })
  }
})

module.exports = router
