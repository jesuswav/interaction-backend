const express = require('express')
const dotenv = require('dotenv')
const router = express.Router()
const jwt = require('jsonwebtoken')
const generateRandomNumber = require('../utils/generateRandomNumber')
const pool = require('../utils/dbConnection')

const scrape = require('../utils/web-scraping')

dotenv.config()

// Obtener todos los posts
router.get('/posts', async (req, res) => {
  const header_token = req.headers.authorization

  if (!header_token || !header_token.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ message: 'Token no proporcionado o inválido' })
  }

  const token = header_token.substring(7)

  try {
    // Verificar el token
    const user = jwt.verify(token, process.env.SECRET_KEY)
    const user_id = user.user_id

    const posts = {}

    // Consulta SQL para obtener publicaciones del usuario
    const query = `
      SELECT 
        Posts.post_page_name,
        Posts.post_id,
        Posts.post_description,
        Posts.post_url,
        Posts.likes,
        Posts.shared,
        DATE_FORMAT(Posts.register_date, '%Y-%m-%d') AS formatted_date,
        Images.image_id,
        Images.image_url
      FROM Posts
      LEFT JOIN Images ON Posts.post_id = Images.post_id
      WHERE Posts.user_id = ?
      ORDER BY Posts.register_date DESC
    `

    const [results] = await pool.query(query, [user_id])

    results.forEach((row) => {
      if (!posts[row.post_id]) {
        posts[row.post_id] = {
          page_name: row.post_page_name,
          post_id: row.post_id,
          post_description: row.post_description,
          post_url: row.post_url,
          likes: row.likes,
          shared: row.shared,
          register_date: row.formatted_date,
          images: [],
          likesList: [],
        }
      }

      if (row.image_id) {
        posts[row.post_id].images.push({
          image_id: row.image_id,
          image_url: row.image_url,
        })
      }

      if (row.like_name) {
        posts[row.post_id].likesList.push({
          like_name: row.like_name,
        })
      }
    })

    res.json(Object.values(posts))
  } catch (err) {
    console.error('Error al obtener los posts o verificar el token:', err)

    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Token inválido' })
    }

    res.status(500).json({ message: 'Error en el servidor', error: err })
  }
})

// para obtener los posts que le corresponden a cada persona
router.post('/user_posts', async (req, res) => {
  const { date } = req.body
  const header_token = req.headers.authorization

  if (!header_token || !header_token.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ message: 'Token no proporcionado o inválido' })
  }

  const token = header_token.substring(7)

  try {
    // Verificamos el token
    const user = jwt.verify(token, process.env.SECRET_KEY)
    const user_id = user.user_id

    // en caso de no tener una fecha
    const dateQuery = `
      SELECT 
        DATE_FORMAT(register_date, '%Y-%m-%d') AS register_date
      FROM Posts
      ORDER BY register_date ASC;
    `

    const [dateResults] = await pool.query(dateQuery)

    const lastDateRegistered = dateResults[dateResults.length - 1].register_date

    let queryDate

    if (date === undefined) {
      queryDate = lastDateRegistered
    } else {
      queryDate = date
    }

    let usersWithPublications = {}

    // Consulta SQL para obtener publicaciones de un usuario
    const query = `
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
      WHERE 
        Posts.user_id = ?
        AND DATE(Posts.register_date) = ?
      ORDER BY
        Personal.personal_id,
        Posts.post_id;
    `

    const [results] = await pool.query(query, [user_id, queryDate])

    const posts_id = results.map((post) => post.post_id)

    // Consulta SQL para obtener likes de las publicaciones
    if (posts_id.length > 0) {
      const likesQuery = `
        SELECT 
          Posts.post_id,
          GROUP_CONCAT(PostLikesList.like_name SEPARATOR ', ') AS like_names
        FROM Posts
        LEFT JOIN PostLikesList ON Posts.post_id = PostLikesList.post_id
        WHERE Posts.post_id IN (?)
        GROUP BY Posts.post_id;
      `

      const [postsWithLikes] = await pool.query(likesQuery, [posts_id])

      // Procesar los resultados y agrupar publicaciones por personal
      results.forEach((row) => {
        if (!usersWithPublications[row.personal_id]) {
          usersWithPublications[row.personal_id] = {
            personal_id: row.personal_id,
            personal_name: row.personal_name,
            personal_team: row.team_name,
            team_color: row.team_color,
            posts: [],
          }
        }

        usersWithPublications[row.personal_id].posts.push({
          post_id: row.post_id,
          post_description: row.post_description,
          checked: row.checked,
          unique_post_id: row.unique_post_id,
          likes: '',
        })
      })

      const userWithPublicationsArray = Object.values(usersWithPublications)

      // Añadir los likes a las publicaciones correspondientes
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

      // Clasificar los resultados por equipo
      const teams = {}

      Object.values(usersWithPublications).forEach((personal) => {
        const { personal_team, team_color, personal_id, personal_name, posts } =
          personal

        if (!teams[personal_team]) {
          teams[personal_team] = {
            team_name: personal_team,
            team_color: team_color,
            members: [],
          }
        }

        teams[personal_team].members.push({
          personal_id,
          personal_name,
          posts,
        })
      })

      const groupedTeams = Object.values(teams)

      res.json(groupedTeams)
    } else {
      console.log('No existen IDs para validar')
      res.json([])
    }
  } catch (err) {
    console.error(
      'Error al obtener las publicaciones o verificar el token:',
      err
    )

    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Token inválido' })
    }

    res.status(500).json({ message: 'Error en el servidor', error: err })
  }
})

// Para registrar un post y crear la relación con todos los usuarios de la DB
router.post('/posts', async (req, res) => {
  const header_token = req.headers.authorization
  const post_url = req.body.post_url

  try {
    // Verificar el token
    const token = header_token.substring(7)
    const user = await new Promise((resolve, reject) => {
      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) return reject(err)
        resolve(decoded)
      })
    })

    // Obtener datos del post
    const postToCreate = await scrape(post_url)

    // Crear arrays para insertar en la base de datos
    const images = postToCreate?.images.map((item) => [
      generateRandomNumber(),
      postToCreate.post_id,
      item,
    ])
    const postLikesList = postToCreate?.likesList.map((item) => [
      generateRandomNumber(),
      item,
      postToCreate.post_id,
    ])

    // Obtener todos los personal_id de la tabla Personal
    const [results] = await pool.query('SELECT personal_id FROM Personal')

    if (results.length === 0) {
      return res.json({ message: 'There are no registers in personal.' })
    }

    // Insertar la nueva publicación en la tabla Posts
    const newPostQuery =
      'INSERT INTO Posts (post_page_name, post_id, post_description, post_url, likes, shared, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    await pool.query(newPostQuery, [
      postToCreate.page_name,
      postToCreate.post_id,
      postToCreate.description,
      postToCreate.post_url,
      postToCreate.likes,
      postToCreate.shared,
      user.user_id,
    ])

    // Obtener el último post_id insertado
    const [lastRegister] = await pool.query(
      'SELECT * FROM Posts ORDER BY register_date DESC LIMIT 1'
    )
    const last_post_id = lastRegister[0].post_id

    // Crear registros en la tabla Interactions para cada personal_id
    const interactions = results.map((row) => [
      generateRandomNumber(),
      row.personal_id,
      last_post_id,
    ])
    const interactionsQuery =
      'INSERT INTO Interactions (unique_post, personal_id, post_id) VALUES ?'
    await pool.query(interactionsQuery, [interactions])

    // Insertar las imágenes del post
    if (images.length > 0) {
      const imagesQuery = `INSERT INTO Images (image_id, post_id, image_url) VALUES ${images
        .map(() => '(?, ?, ?)')
        .join(', ')}`
      const flattenedImages = images.flat()
      await pool.query(imagesQuery, flattenedImages)
    }

    // Insertar la lista de likes
    if (postLikesList.length > 0) {
      const likesListQuery = `INSERT INTO PostLikesList (post_list_id, like_name, post_id) VALUES ${postLikesList
        .map(() => '(?, ?, ?)')
        .join(', ')}`
      const flattenedLikes = postLikesList.flat()
      await pool.query(likesListQuery, flattenedLikes)
    }

    res.status(201).json('Publicación y relaciones creadas exitosamente')
  } catch (err) {
    console.error('Error en la creación del post:', err)
    res.status(500).json({ message: 'Error en el servidor', error: err })
  }
})

// Para actualizar el valor de una publicación de un usuario
router.put('/posts', async (req, res) => {
  const { id, value } = req.body

  if (!id || value === undefined) {
    return res.status(400).json({ message: 'ID y valor son requeridos' })
  }

  try {
    // Consulta SQL para actualizar la publicación
    const query = 'UPDATE Interactions SET checked = ? WHERE unique_post = ?'
    await pool.query(query, [value, id])

    res.json({ id, value })
  } catch (err) {
    console.error('Error al actualizar la publicación', err)
    res.status(500).json({ message: 'Error en el servidor', error: err })
  }
})

// Para borrar una publicación
router.delete('/posts', async (req, res) => {
  const post_id = req.body.post_id

  try {
    // Eliminar el post
    await pool.query('DELETE FROM Posts WHERE post_id = ?', [post_id])
    res.json({ post_id })
  } catch (err) {
    console.error('Error al eliminar el Post', err)
    res.status(500).json({ message: 'Error al eliminar el post', error: err })
  }
})

// Update posts values
router.post('/update-post', async (req, res) => {
  const post_url = req.body.post_url
  const user_id = 71727959

  try {
    // Scrapea el post desde la URL proporcionada
    const postToCreate = await scrape(post_url)

    // Actualiza el post en la base de datos
    await pool.query(
      `
      UPDATE Posts
      SET
        post_description = ?,
        likes = ?,
        shared = ?
      WHERE
        post_id = ?
        AND user_id = ?
      `,
      [
        postToCreate.description,
        postToCreate.likes,
        postToCreate.shared,
        postToCreate.post_id,
        user_id,
      ]
    )

    // Elimina las imágenes del post
    await pool.query(
      `
      DELETE FROM Images
      WHERE post_id = ?
      `,
      [postToCreate.post_id]
    )

    // Elimina la lista de likes del post
    await pool.query(
      `
      DELETE FROM PostLikesList
      WHERE post_id = ?
      `,
      [postToCreate.post_id]
    )

    // Prepara las imágenes para insertar
    const images =
      postToCreate?.images.map((item) => [
        generateRandomNumber(),
        postToCreate.post_id,
        item,
      ]) || []

    if (images.length > 0) {
      const imagesQuery = `INSERT INTO Images (image_id, post_id, image_url) VALUES ${images
        .map(() => '(?, ?, ?)')
        .join(', ')}`

      const flattenedImages = images.flat()
      await pool.query(imagesQuery, flattenedImages)
    }

    // Prepara la lista de likes para insertar
    const postLikesList =
      postToCreate?.likesList.map((item) => [
        generateRandomNumber(),
        item,
        postToCreate.post_id,
      ]) || []

    if (postLikesList.length > 0) {
      const likesListQuery = `INSERT INTO PostLikesList (post_list_id, like_name, post_id) VALUES ${postLikesList
        .map(() => '(?, ?, ?)')
        .join(', ')}`

      const flattenedLikes = postLikesList.flat()
      await pool.query(likesListQuery, flattenedLikes)
    }

    res.status(201).json('Publicación e imágenes actualizadas exitosamente')
  } catch (err) {
    console.error('Error al actualizar la publicación', err)
    res
      .status(500)
      .json({ message: 'Error al actualizar la publicación', error: err })
  }
})

// Prueba para la funcion de web-scraping
router.post('/prueba', async (req, res) => {
  const post_url = req.body.post_url

  const postToCreate = await scrape(post_url)

  console.log(postToCreate)

  res.json(postToCreate)
})

module.exports = router
