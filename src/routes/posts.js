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
  charset: 'utf8mb4',
})

// Obtener todos los posts
router.get('/posts', (req, res) => {
  connection.query('SELECT * FROM Posts', (err, results) => {
    if (err) {
      console.error('Error al obtener los Posts', err)
    }
    res.json(Object.values(results))
  })
})

// para obtener los posts que le corresponden a cada persona
router.post('/user_posts', (req, res) => {
  const date = req.body.date
  var usersWithPublications = {}

  connection.query(
    `
      SELECT
      Personal.personal_id,
      Personal.personal_name,
      Posts.post_id,
      Posts.post_name,
      Posts.register_date,
      Interactions.checked,
      Interactions.unique_post AS unique_post_id,
      Teams.team_name,
      Teams.team_color
    FROM
      Personal
      INNER JOIN Teams ON Personal.team_id = Teams.team_id
      LEFT JOIN Interactions ON Personal.personal_id = Interactions.personal_id
      LEFT JOIN Posts ON Interactions.post_id = Posts.post_id
    WHERE
      DATE(Posts.register_date) = ?
    ORDER BY
      Personal.personal_id,
      Posts.post_id;
  `,
    [date],
    (err, results) => {
      if (err) {
        console.log('Error', err)
      }
      results?.forEach((row) => {
        console.log(
          row.personal_name,
          row.personal_id,
          row.post_name,
          row.register_date,
          row.checked,
          row.unique_post_id,
          row.team_name,
          row.team_color
        )

        if (!usersWithPublications[row.personal_id]) {
          // Si no existe, crea una nueva entrada para el usuario
          usersWithPublications[row.personal_id] = {
            personal_id: row.personal_id,
            personal_name: row.personal_name,
            personal_team: row.team_name,
            team_color: row.team_color,
            posts: [],
          }
        }

        // Añade la publicación actual al array de publicaciones del usuario
        usersWithPublications[row.personal_id].posts.push({
          post_id: row.post_id,
          post_name: row.post_name,
          register_date: row.register_date,
          checked: row.checked,
          unique_post_id: row.unique_post_id,
        })
      })
      res.json(Object.values(usersWithPublications))
    }
  )
})

// Para registrar un post y crear la relación con todos los usuarios de la DB
router.post('/posts', (req, res) => {
  const { post_name, post_url } = req.body
  let last_post_id = 0

  function generateRandomNumber() {
    // Genera un número aleatorio entre 0 y 99999999
    let randomNumber = Math.floor(Math.random() * 100000000)

    // Asegura que el número tenga exactamente 8 dígitos
    return String(randomNumber).padStart(8, '0')
  }

  // Obtener todos los personal_id de la tabla Personal
  connection.query('SELECT personal_id FROM Personal', (err, results) => {
    if (err) {
      console.error('Error al obtener personal_id:', err)
      return res.status(500).send('Error al obtener personal_id')
    }
    console.log(results)

    // Insertar la nueva publicación en la tabla Posts
    const newPostQuery =
      'INSERT INTO Posts (post_id, post_name, url) VALUES (LPAD(FLOOR(RAND() * 100000000), 8, "0"), ?, ?)'
    connection.query(newPostQuery, [post_name, post_url], (err) => {
      if (err) {
        console.error('Error al insertar en Posts:', err)
        return res.status(500).send('Error al insertar la publicación')
      }

      connection.query(
        'SELECT * FROM Posts ORDER BY register_date DESC LIMIT 1',
        (err, lastRegister) => {
          if (err) {
            console.error('Error en la petición', err)
          } else {
            console.log('Ultimo registro en la base de datos:')
            console.log(lastRegister[0].post_id)
            last_post_id = lastRegister[0].post_id

            // Crear registros en la tabla Interactions para cada personal_id
            console.log(results)
            const interactions = results.map((row) => [
              generateRandomNumber(),
              row.personal_id,
              last_post_id,
            ])
            console.log('Last post ID: ', last_post_id)
            console.log('Interacciones: ', interactions)
            const interactionsQuery =
              'INSERT INTO Interactions (unique_post, personal_id, post_id) VALUES ?'

            connection.query(interactionsQuery, [interactions], (err) => {
              if (err) {
                console.error('Error al insertar en Interactions:', err)
                return res.status(500).send('Error al insertar en Interactions')
              }

              res
                .status(201)
                .json('Publicación y relaciones creadas exitosamente')
            })
          }
        }
      )
    })
  })
})

// Para actualizar el valor de una publicación de un usuario
router.put('/posts', (req, res) => {
  const id = req.body.id
  const value = req.body.value

  connection.query(
    'UPDATE Interactions SET checked = ? WHERE unique_post = ?',
    [value, id],
    (err) => {
      if (err) {
        console.error('Error al actualizar la publicación', err)
      }
      res.json({ id, value })
    }
  )
})

// Para borrar una publicación
router.delete('/posts', (req, res) => {
  const post_id = req.body.post_id

  connection.query('DELETE FROM Posts WHERE post_id = ?', [post_id], (err) => {
    if (err) {
      console.error('Error al eliminar el Post', err)
    }
    res.json({ post_id })
  })
})

module.exports = router
