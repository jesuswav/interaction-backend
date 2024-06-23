const express = require('express')
const mysql = require('mysql')
const dotenv = require('dotenv')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const generateRandomNumber = require('../utils/generateRandomNumber')

const scrape = require('../utils/web-scraping')

dotenv.config()

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
})

router.get('/users', (req, res) => {
  connection.query('SELECT * FROM Users', (err, results) => {
    if (err) {
      console.error('Error al obtener los datos de Personal', err)
    }
    res.json(Object.values(results))
  })
})

router.post('/user', (req, res) => {
  const authHeader = req.headers.authorization

  const token = authHeader.substring(7)

  console.log(token)

  if (!token) {
    return res.sendStatus(401)
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.sendStatus(403)
    }

    connection.query(
      'SELECT * FROM Users WHERE username = ?',
      user.username,
      (err, results) => {
        if (err) {
          return res.status(400).json({ message: 'Usuario no encontrado' })
        }

        res.json(Object.values(results))
      }
    )
  })
})

router.post('/users', async (req, res) => {
  const { username, name, last_name, phone_number, password } = req.body

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: 'Username and password are required.' })
  }

  try {
    const salt = await bcrypt.genSalt(10)
    const hashed_pass = await bcrypt.hash(password, salt)

    // Generamos un número de 8 digitos para el user_id
    const user_id = generateRandomNumber()
    console.log(hashed_pass)

    const query =
      'INSERT INTO Users (user_id, username, name, last_name, phone_number, password_hash) VALUES (?, ?, ?, ?, ?, ?)'
    connection.query(
      query,
      [user_id, username, name, last_name, phone_number, hashed_pass],
      (err) => {
        if (err) {
          return res
            .status(500)
            .json({ message: 'Error registering user', error: err })
        }
        res.status(201).json({ message: 'User registered successfully' })
      }
    )
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error', error: error })
  }
})

router.post('/login', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ message: 'Credenciales requeridas' })
  }

  const query = 'SELECT * FROM Users WHERE username = ?'
  connection.query(query, [username], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err })
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'User not found' })
    }

    const user = results[0]
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    const userForToken = {
      user_id: results[0].user_id,
      username: results[0].username,
    }

    const token = jwt.sign(userForToken, process.env.SECRET_KEY)

    // res.cookie('token', token, {
    //   httpOnly: true,
    //   secure: true,
    //   maxAge: 36000000,
    // })

    res.status(200).json({ message: 'Login succesfull', token: token })
  })
})

router.post('/verify', (req, res) => {
  const token = req.body.loginToken

  console.log(token)

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized token' })
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' })
    }
  })

  res.json({ message: 'Allow access', user: req.user })
})

router.delete('/users', (req, res) => {
  const personal_id = req.body.personal_id
  console.log(personal_id)

  connection.query(
    'DELETE FROM Personal WHERE personal_id = ?',
    [personal_id],
    (err) => {
      if (err) {
        console.error('Error al borrar el registro ', err)
      }
      res.json('Resultado borrado exitosamente')
    }
  )
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
