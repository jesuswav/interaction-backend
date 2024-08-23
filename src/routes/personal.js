const express = require('express')
const mysql = require('mysql')
const dotenv = require('dotenv')
const router = express.Router()
const jwt = require('jsonwebtoken')
const connection = require('../utils/dbConnection')

dotenv.config()

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

// Endpoint para buscar personal
router.post('/search', (req, res) => {
  const search = req.body.search
  const header_token = req.headers.authorization

  const searchValue = `%${search}%`

  console.log('Desde afuera', search)

  if (search === '') {
    console.log('Ultima peticion')
  }

  if (search !== '') {
    console.log('Ultima peticion desde dentro', search)
    const token = header_token.substring(7)

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid token' })
      }

      const user_id = user.user_id

      var usersWithPublications = {}

      connection.query(
        `
      SELECT
        Personal.personal_id,
        Personal.personal_name,
        Posts.post_id,
        Posts.post_description,
        Posts.user_id,
        Interactions.checked,
        Interactions.unique_post AS unique_post_id,
        Teams.team_name,
        Teams.team_color
      FROM
        Personal
      INNER JOIN Teams ON Personal.team_id = Teams.team_id
      LEFT JOIN Interactions ON Personal.personal_id = Interactions.personal_id
      LEFT JOIN Posts ON Interactions.post_id = Posts.post_id AND Posts.user_id = ?
      WHERE
        Personal.personal_name LIKE ?
      ORDER BY
        Personal.personal_id,
        Posts.post_id;
      `,
        [user_id, searchValue],
        (err, results) => {
          if (err) {
            console.log('Error', err)
          }

          if (!results[0]?.user_id) {
            res.json(Object.values([]))
          } else {
            var posts_id = []

            // sacamos los id de los posts para buscarlos posteriormente en otra consulta a la base de datos
            results?.forEach((post) => {
              posts_id.push(post.post_id)
            })

            const likesQuery = `
          SELECT 
            Posts.post_id,
            GROUP_CONCAT(PostLikesList.like_name SEPARATOR ', ') AS like_names
          FROM Posts
          LEFT JOIN PostLikesList ON Posts.post_id = PostLikesList.post_id
          WHERE Posts.post_id IN (?)
          GROUP BY Posts.post_id
        `

            // Comprobar si hay IDs para evitar lanzar un error SQL
            if (posts_id.length > 0) {
              connection.query(
                likesQuery,
                [posts_id],
                (err, postsWithLikes) => {
                  if (err) {
                    console.log(err)
                  }

                  results?.forEach((row) => {
                    //   WHERE
                    // DATE(Posts.register_date) = ?

                    // [date],

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
                      post_description: row.post_description,
                      checked: row.checked,
                      unique_post_id: row.unique_post_id,
                      likes: '',
                    })

                    const userWithPublicationsArray = Object.values(
                      usersWithPublications
                    )

                    // Agregamos los likes a los usuarios con publicaciones y a las publicaciones respectivas
                    userWithPublicationsArray.forEach((item) => {
                      item.posts.forEach((item_post) => {
                        postsWithLikes.forEach((post_id_item) => {
                          if (item_post.post_id === post_id_item.post_id) {
                            usersWithPublications[
                              item.personal_id
                            ].posts.forEach((final_post) => {
                              if (final_post.post_id === post_id_item.post_id) {
                                final_post.likes = post_id_item.like_names
                              }
                            })
                          }
                        })
                      })
                    })
                  })

                  //Obtener los resultados clasificados en base al equipo que tienen

                  const teams = {}

                  // Recorrer el objeto original
                  Object.values(usersWithPublications).forEach((personal) => {
                    const {
                      personal_team,
                      team_color,
                      personal_id,
                      personal_name,
                      posts,
                    } = personal

                    // Si el equipo no existe en el objeto teams, lo creamos
                    if (!teams[personal_team]) {
                      teams[personal_team] = {
                        team_name: personal_team,
                        team_color: team_color,
                        members: [],
                      }
                    }

                    // Agregar el personal al equipo correspondiente
                    teams[personal_team].members.push({
                      personal_id,
                      personal_name,
                      posts,
                    })
                  })

                  // Convertir el objeto teams en un array
                  const groupedTeams = Object.values(teams)

                  console.log('Desde dentro: ', search)

                  res.json(Object.values(usersWithPublications))
                }
              )
            } else {
              console.log('No hay IDs disponibles.')
            }
          }
        }
      )
    })
  } else {
    // --------------
    console.log('No existen coincidencias ----')
    return res.status(200).json({ message: 'Sin parametro de busqueda' })
  }
})

module.exports = router
