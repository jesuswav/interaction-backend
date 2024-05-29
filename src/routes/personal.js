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

router.get('/algo', (req, res) => {
  connection.query('SELECT * FROM Posts', (err, results) => {
    if (err) {
      console.log('Error', err)
    }
    res.json(results)
  })
})

module.exports = router
