const express = require('express')
const dotenv = require('dotenv')
const router = express.Router()
const jwt = require('jsonwebtoken')
const generateRandomNumber = require('../utils/generateRandomNumber')
const connection = require('../utils/dbConnection')

const scrape = require('../utils/web-scraping')

dotenv.config()

// Obtener todos los posts
router.get('/posts', (req, res) => {
  const header_token = req.headers.authorization

  const token = header_token.substring(7)

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' })
    }

    const posts = {}

    connection.query(
      `
    SELECT 
      Posts.post_id,
      Posts.post_description,
      Posts.post_url,
      Posts.likes,
      Posts.shared,
      Images.image_id,
      Images.image_url
    FROM Posts
      LEFT JOIN Images ON Posts.post_id = Images.post_id
    WHERE
      Posts.user_id = ?
  `,
      [user.user_id],
      (err, results) => {
        if (err) {
          console.error('Error al obtener los Posts', err)
        }

        results.forEach((row) => {
          // console.log(row.post_id, row.shared, row.likes, row.post_description)

          if (!posts[row.post_id]) {
            posts[row.post_id] = {
              post_id: row.post_id,
              post_description: row.post_description,
              post_url: row.post_url,
              likes: row.likes,
              shared: row.shared,
              images: [],
              likesList: [],
            }
          }

          posts[row.post_id].images.push({
            image_id: row.image_id,
            image_url: row.image_url,
          })

          posts[row.post_id].likesList.push({
            like_name: row.like_name,
          })
        })
        res.json(Object.values(posts))
      }
    )
  })
})

// para obtener los posts que le corresponden a cada persona
router.post('/user_posts', (req, res) => {
  const date = req.body.date
  const header_token = req.headers.authorization

  const token = header_token.substring(7)

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' })
    }

    var usersWithPublications = {}

    connection.query(
      `
      SELECT
        Personal.personal_id,
        Personal.personal_name,
        Posts.post_id,
        Posts.post_description,
        Interactions.checked,
        Interactions.unique_post AS unique_post_id,
        Teams.team_name,
        Teams.team_color
      FROM
        Personal
        INNER JOIN Teams ON Personal.team_id = Teams.team_id
        LEFT JOIN Interactions ON Personal.personal_id = Interactions.personal_id
        LEFT JOIN Posts ON Interactions.post_id = Posts.post_id
      WHERE Posts.user_id = ?
      ORDER BY
        Personal.personal_id,
        Posts.post_id;
  `,
      [user.user_id],
      (err, results) => {
        if (err) {
          console.log('Error', err)
        }

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
          GROUP BY Posts.post_id;
        `

        connection.query(likesQuery, [posts_id], (err, postsWithLikes) => {
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
                    usersWithPublications[item.personal_id].posts.forEach(
                      (final_post) => {
                        if (final_post.post_id === post_id_item.post_id) {
                          final_post.likes = post_id_item.like_names
                        }
                      }
                    )
                  }
                })
              })
            })
          })

          res.json(Object.values(usersWithPublications))
        })
      }
    )
  })
})

router.post('/prueba', async (req, res) => {
  const post_url = req.body.post_url

  const postToCreate = await scrape(post_url)

  console.log(postToCreate)

  res.json(postToCreate)
})

// Para registrar un post y crear la relación con todos los usuarios de la DB
router.post('/posts', async (req, res) => {
  const header_token = req.headers.authorization
  const post_url = req.body.post_url
  let last_post_id = 0

  const postToCreate = await scrape(post_url)

  console.log(postToCreate)

  const token = header_token.substring(7)

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' })
    }

    // Creamos el array para registrar las imagenes de la publicacion
    const images = []

    postToCreate?.images.forEach((item) =>
      images.push([generateRandomNumber(), postToCreate.post_id, item])
    )

    // Creamos el array para registrar la lista de personas que dieron like a la publicacion
    const postLikesList = []

    postToCreate.likesList.forEach((item) =>
      postLikesList.push([generateRandomNumber(), item, postToCreate.post_id])
    )

    // Obtener todos los personal_id de la tabla Personal
    connection.query('SELECT personal_id FROM Personal', (err, results) => {
      if (err) {
        console.error('Error al obtener personal_id:', err)
        return res.status(500).send('Error al obtener personal_id')
      }
      console.log(results)

      const checkUsersQuery = 'SELECT * FROM Personal'
      connection.query(checkUsersQuery, (err, personal) => {
        if (err) {
          console.log('Error searching for personal...')
        }

        console.log('Personal: ', personal)

        if (personal.length === 0) {
          return res.json({ message: 'There are no registers in personal.' })
        }

        // Insertar la nueva publicación en la tabla Posts
        const newPostQuery =
          'INSERT INTO Posts (post_id, post_description, post_url, likes, shared, user_id) VALUES (?, ?, ?, ?, ?, ?)'
        connection.query(
          newPostQuery,
          [
            postToCreate.post_id,
            postToCreate.description,
            postToCreate.post_url,
            postToCreate.likes,
            postToCreate.shared,
            user.user_id,
          ],
          (err) => {
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
                  last_post_id = lastRegister[0].post_id

                  // Crear registros en la tabla Interactions para cada personal_id
                  const interactions = results.map((row) => [
                    generateRandomNumber(),
                    row.personal_id,
                    last_post_id,
                  ])
                  const interactionsQuery =
                    'INSERT INTO Interactions (unique_post, personal_id, post_id) VALUES ?'

                  connection.query(interactionsQuery, [interactions], (err) => {
                    if (err) {
                      console.error('Error al insertar en Interactions:', err)
                      return res
                        .status(500)
                        .send('Error al insertar en Interactions')
                    }

                    const imagesQuery = `INSERT INTO Images (image_id, post_id, image_url) VALUES ${images
                      .map(() => '(?, ?, ?)')
                      .join(', ')}`

                    const flattenedImages = images.flat()

                    connection.query(
                      imagesQuery,
                      flattenedImages,
                      (err, result) => {
                        if (err) {
                          console.log(
                            'Error al registrar las imagenes en la base de datos.'
                          )
                          console.log(err)
                          return res
                            .status(500)
                            .send('Error al insertar las imagenes en la DB.')
                        }

                        const likesListQuery = `INSERT INTO PostLikesList (post_list_id, like_name, post_id) VALUES ${postLikesList
                          .map(() => '(?, ?, ?)')
                          .join(', ')}`

                        const flattenedLikes = postLikesList.flat()

                        connection.query(
                          likesListQuery,
                          flattenedLikes,
                          (err) => {
                            if (err) {
                              console.log(
                                'Error al registrar la lista de likes en la base de datos.'
                              )
                              console.log(err)
                              return res
                                .status(500)
                                .send('Error al insertar los likes en la DB.')
                            }
                          }
                        )
                      }
                    )

                    res
                      .status(201)
                      .json('Publicación y relaciones creadas exitosamente')
                  })
                }
              }
            )
          }
        )
      })
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
