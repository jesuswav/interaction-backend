const express = require('express')
const mysql = require('mysql')
const dotenv = require('dotenv')
const router = express.Router()

const scrape = require('../utils/web-scraping')

dotenv.config()

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
})

router.get('/users', (req, res) => {
  connection.query('SELECT * FROM Personal', (err, results) => {
    if (err) {
      console.error('Error al obtener los datos de Personal', err)
    }
    res.json(Object.values(results))
  })
})

router.post('/users', (req, res) => {
  connection.query(
    'INSERT INTO Personal (personal_id, personal_name, team_id) VALUES (LPAD(FLOOR(RAND() * 100000000), 8, "0"), ?, "07289281");'
  )
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
