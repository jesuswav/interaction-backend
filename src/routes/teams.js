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

router.get('/teams', (req, res) => {
  connection.query('SELECT * FROM Teams', (err, results) => {
    if (err) {
      console.error('Error al obtener los Equipos', err)
    }

    let teams = []

    results.map((item) => {
      teams.push({
        value: item.team_id,
        label: item.team_name,
        color: item.team_color,
      })
    })

    console.log(teams)

    res.json(Object.values(teams))
  })
})

router.post('/teams', (req, res) => {
  const team_name = req.body.team_name
  const team_color = req.body.team_color

  connection.query(
    'INSERT INTO Teams (team_id, team_name, team_color) VALUES (LPAD(FLOOR(RAND() * 100000000), 8, "0"), ?, ?)',
    [team_name, team_color],
    (err) => {
      if (err) {
        console.error('Error al registrar el equipo: ', err)
      }
      res.send('Equipo registrado exitosamente')
    }
  )
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
