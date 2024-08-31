const express = require('express')
const dotenv = require('dotenv')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const generateRandomNumber = require('../utils/generateRandomNumber')
const connection = require('../utils/dbConnection')
// importamos el nuevo modulo de conexion a la base de datos
const pool = require('../utils/dbConnection')

const scrape = require('../utils/web-scraping')

dotenv.config()

// Obtener todos los usuarios registrados como administradores en la base de datos
router.get('/users', async (req, res) => {
  try {
    // Ejecutamos la consulta directamente usando el pool
    const [results] = await pool.query('SELECT * FROM Users')
    res.json(results) // Enviamos la respuesta como JSON
  } catch (err) {
    console.error('Error al obtener los datos de Users', err)
    res.status(500).send('Error al obtener los datos de la base de datos')
  }
})

router.post('/user', async (req, res) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.sendStatus(401) // Si no hay token, devolvemos un error 401
  }

  const token = authHeader.substring(7) // Extraemos el token (eliminamos el prefijo 'Bearer ')

  try {
    const user = jwt.verify(token, process.env.SECRET_KEY) // Verificamos el token

    // Consulta a la base de datos usando el pool
    const [results] = await pool.query(
      'SELECT * FROM Users WHERE username = ?',
      [user.username]
    )

    if (results.length === 0) {
      return res.status(400).json({ message: 'Usuario no encontrado' })
    }

    res.json(results) // Devolvemos los resultados en formato JSON
  } catch (err) {
    console.error(
      'Error al verificar el token o al consultar la base de datos:',
      err
    )

    if (err.name === 'JsonWebTokenError') {
      return res.sendStatus(403) // Si el token es inválido, devolvemos un error 403
    }

    res.status(500).send('Error interno del servidor')
  }
})

// Crear una nueva cuenta de lider o administrador
router.post('/users', async (req, res) => {
  const { username, name, last_name, phone_number, password } = req.body

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: 'El nombre de usuario y la contraseña son requeridos.' })
  }

  try {
    // Generamos un salt y hasheamos la contraseña
    const salt = await bcrypt.genSalt(10)
    const hashed_pass = await bcrypt.hash(password, salt)

    // Generamos un número de 8 dígitos para el user_id
    const user_id = generateRandomNumber()
    console.log(hashed_pass)

    const query =
      'INSERT INTO Users (user_id, username, name, last_name, phone_number, password_hash) VALUES (?, ?, ?, ?, ?, ?)'

    // Ejecutamos la consulta usando el pool de conexiones
    const [result] = await pool.query(query, [
      user_id,
      username,
      name,
      last_name,
      phone_number,
      hashed_pass,
    ])

    res.status(201).json({ message: 'Usuario registrado exitosamente' })
  } catch (err) {
    console.error('Error al registrar el usuario:', err)
    res.status(500).json({ message: 'Error en el servidor', error: err })
  }
})

// Endpoint para iniciar sesion
router.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ message: 'Credenciales requeridas' })
  }

  try {
    const query = 'SELECT * FROM Users WHERE username = ?'

    // Ejecutamos la consulta usando el pool de conexiones
    const [results] = await pool.query(query, [username])

    if (results.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' })
    }

    const user = results[0]
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }

    // Creamos el token JWT
    const userForToken = {
      user_id: user.user_id,
      username: user.username,
    }

    const token = jwt.sign(userForToken, process.env.SECRET_KEY)

    res.status(200).json({ message: 'Inicio de sesión exitoso', token: token })
  } catch (err) {
    console.error('Error en el proceso de login:', err)
    res.status(500).json({ message: 'Error en la base de datos', error: err })
  }
})

// Verificar si el token guardado en el cliente es correcto
router.post('/verify', async (req, res) => {
  const token = req.body.loginToken

  console.log(token)

  if (!token) {
    return res.status(401).json({ message: 'Token no autorizado' })
  }

  try {
    // Verificamos el token JWT
    const user = jwt.verify(token, process.env.SECRET_KEY)

    // Devolvemos el usuario verificado
    res.json({ message: 'Acceso permitido', user: user })
  } catch (err) {
    console.error('Error al verificar el token:', err)

    // En caso de error de verificación, enviamos un error 403
    return res.status(403).json({ message: 'Token inválido' })
  }
})

// Borrar algun elemento de la lista de personal
router.delete('/users', async (req, res) => {
  const personal_id = req.body.personal_id
  console.log(personal_id)

  if (!personal_id) {
    return res.status(400).json({ message: 'ID del personal requerido' })
  }

  try {
    // Ejecutamos la consulta para borrar el registro
    const [result] = await pool.query(
      'DELETE FROM Personal WHERE personal_id = ?',
      [personal_id]
    )

    // Si no se borró ningún registro, devolvemos un mensaje adecuado
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Registro no encontrado' })
    }

    res.json({ message: 'Registro borrado exitosamente' })
  } catch (err) {
    console.error('Error al borrar el registro:', err)
    res.status(500).json({ message: 'Error al borrar el registro', error: err })
  }
})
router.get('/scrape', async (req, res) => {
  urls = [
    'https://www.facebook.com/UTCalvillo/posts/pfbid02za96ZKkrXHJQ1CsY9SC7mxmTbrUtcgURws8d9AFR6RmCRk1fQhrMDRXCcvqs1Ldyl',
    'https://www.facebook.com/UTCalvillo/posts/pfbid02FZ8H1B5izQSG4tdq1FkpVcUXzrKNdpWN84aRzNbpVeisMLy5xqVGK2sHic9sB7QJl',
    'https://www.facebook.com/UTCalvillo/posts/pfbid023z933yzR64JPoEAp9qu5doXfJvM164vNTdux9VgK5htF1VjPp1MavYLAqPDH12Z1l',
    'https://www.facebook.com/PuntoNocturnoPodcast/posts/pfbid0J2jpJ96d51Sh4Ak1Rgr8eAs5yr8VtjnvuVduvQiYWyZd5JngvrEGmUzPHNzaz3czl',
    'https://www.facebook.com/share/p/denWZ7obUeX4Kwzu/',
  ]
  const postInfo = await scrape(
    'https://www.facebook.com/PuntoNocturnoPodcast/posts/pfbid0J2jpJ96d51Sh4Ak1Rgr8eAs5yr8VtjnvuVduvQiYWyZd5JngvrEGmUzPHNzaz3czl'
  )

  res.send(postInfo)
})

module.exports = router
