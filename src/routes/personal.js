const express = require('express')
const mysql = require('mysql')
const dotenv = require('dotenv')
const router = express.Router()
const jwt = require('jsonwebtoken')
const pool = require('../utils/dbConnection')

dotenv.config()

// Obtener a todo el personal registrado
router.get('/personal', async (req, res) => {
  const header_token = req.headers.authorization

  if (!header_token || !header_token.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ message: 'Token no proporcionado o inválido' })
  }

  const token = header_token.substring(7) // Quitamos el prefijo 'Bearer '

  try {
    // Verificamos el token
    const user = jwt.verify(token, process.env.SECRET_KEY)

    const user_id = user.user_id

    // Ejecutamos la consulta utilizando el pool de conexiones
    const query = `
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
    `

    const [results] = await pool.query(query, [user_id])

    res.json(results) // Devolvemos los resultados
  } catch (err) {
    console.error('Error al verificar el token o al realizar la consulta:', err)

    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Token inválido' })
    }

    res.status(500).json({ message: 'Error en el servidor', error: err })
  }
})

// Registrar a alguien dentro del personal
router.post('/personal', async (req, res) => {
  const { personal_name, team_id } = req.body
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

    // Consulta SQL para insertar un nuevo registro en la tabla Personal
    const query = `
      INSERT INTO Personal (personal_id, personal_name, team_id, user_id) 
      VALUES (LPAD(FLOOR(RAND() * 100000000), 8, "0"), ?, ?, ?)
    `

    // Ejecutamos la consulta utilizando el pool de conexiones
    await pool.query(query, [personal_name, team_id, user_id])

    res.json({ message: 'Registro insertado exitosamente', personal_name })
  } catch (err) {
    console.error('Error al insertar el registro o verificar el token:', err)

    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Token inválido' })
    }

    res.status(500).json({ message: 'Error en el servidor', error: err })
  }
})

// Endpoint para buscar personal
router.post('/search', async (req, res) => {
  const { search } = req.body
  const header_token = req.headers.authorization

  if (!header_token || !header_token.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ message: 'Token no proporcionado o inválido' })
  }

  const searchValue = `%${search}%`

  if (!search) {
    console.log('Sin parámetro de búsqueda')
    return res.status(200).json({ message: 'Sin parámetro de búsqueda' })
  }

  const token = header_token.substring(7)

  try {
    // Verificamos el token
    const user = jwt.verify(token, process.env.SECRET_KEY)
    const user_id = user.user_id

    let usersWithPublications = {}

    // Primera consulta para obtener personal y publicaciones relacionadas
    const query = `
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
    `

    const [results] = await pool.query(query, [user_id, searchValue])

    if (!results[0]?.user_id) {
      return res.json([])
    }

    const posts_id = results.map((post) => post.post_id)

    // Segunda consulta para obtener likes
    if (posts_id.length > 0) {
      const likesQuery = `
        SELECT 
          Posts.post_id,
          GROUP_CONCAT(PostLikesList.like_name SEPARATOR ', ') AS like_names
        FROM Posts
        LEFT JOIN PostLikesList ON Posts.post_id = PostLikesList.post_id
        WHERE Posts.post_id IN (?)
        GROUP BY Posts.post_id
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

      res.json(Object.values(usersWithPublications))
    } else {
      console.log('No hay IDs disponibles.')
      res.json([])
    }
  } catch (err) {
    console.error('Error al realizar la búsqueda o verificar el token:', err)

    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Token inválido' })
    }

    res.status(500).json({ message: 'Error en el servidor', error: err })
  }
})

module.exports = router
