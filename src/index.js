const express = require('express')
// import express from "express"
const dotenv = require('dotenv')
// import dotenv from "dotenv"
const { createClient } = require('@libsql/client')
// import { createClient } from "@libsql/client"
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())
const PORT = process.env.port || 3000

dotenv.config()
// Conexión con la base de datos
const db = createClient({
  url: 'libsql://positive-screwball-jesuswav.turso.io',
  authToken: process.env.DB_TOKEN,
})

app.post('/registros', async (req, res) => {
  const date = req.body.date
  let usuariosConPublicaciones = {}

  try {
    const name = 'Jesus'
    console.log('Ejecutando el try')
    const results = await db.execute({
      sql: `
      SELECT
      Personal.personal_id,
      Personal.name AS personal_name,
      Posts.post_id,
      Posts.name AS post_name,
      Posts.registerDate,
      Interactions.checked,
      Interactions.unique_post AS unique_post_id
    FROM
      Personal
      LEFT JOIN Interactions ON Personal.personal_id = Interactions.personal_id
      LEFT JOIN Posts ON Interactions.post_id = Posts.post_id
    WHERE
      DATE(Posts.registerDate) = :date
    ORDER BY
      Personal.personal_id,
      Posts.post_id;
      `,
      args: { date },
    })

    results.rows.forEach((row) => {
      console.log(
        row.personal_name,
        row.personal_id,
        row.post_name,
        row.registerDate,
        row.checked,
        row.unique_post_id
      )

      if (!usuariosConPublicaciones[row.personal_id]) {
        // Si no existe, crea una nueva entrada para el usuario
        usuariosConPublicaciones[row.personal_id] = {
          personal_id: row.personal_id,
          personal_name: row.personal_name,
          posts: [],
        }
      }

      // Añade la publicación actual al array de publicaciones del usuario
      usuariosConPublicaciones[row.personal_id].posts.push({
        post_id: row.post_id,
        post_name: row.post_name,
        registerDate: row.registerDate,
        checked: row.checked,
        unique_post_id: row.unique_post_id,
      })
    })
  } catch (e) {
    console.error(e)
  }
  res.json(Object.values(usuariosConPublicaciones))
})

app.get('/dates', async (req, res) => {
  const dates = await db.execute(`
  SELECT DISTINCT DATE(registerDate) AS registerDate
  FROM Posts
  WHERE DATE(registerDate) >= DATE('now', '-2 months')
  ORDER BY registerDate;
  `)
  var datesArray = []

  dates.rows.forEach((row) => {
    console.log(row.registerDate)
    datesArray.push(row.registerDate)
  })
  res.json(datesArray)
})

app.post('/personal', (req, res) => {
  const name = req.body.name
  console.log(req.body.name)
  try {
    const results = db.execute({
      sql: 'INSERT INTO Personal (name) VALUES (:name)',
      args: { name },
    })
  } catch (e) {
    console.error(e)
  }
  res.json(name)
})

app.get('/personal', async (req, res) => {
  const personal = await db.execute('SELECT * FROM Personal')
  var users = []
  personal.rows.forEach((row) => {
    users.push({
      user_id: row.personal_id,
      user_name: row.name,
    })
  })
  res.json(users)
})

app.post('/posts', async (req, res) => {
  const post_name = req.body.post_name
  const post_url = req.body.post_url
  console.log(post_name)
  console.log(post_url)
  try {
    // creamos el trigger para la relación
    // const trigger = db.execute(`
    // CREATE TRIGGER IF NOT EXISTS crear_interaccion_despues_de_insertar
    // AFTER INSERT ON Posts
    // FOR EACH ROW
    // BEGIN
    //   INSERT INTO Interactions (personal_id, post_id)
    //   SELECT personal_id, NEW.post_id FROM Personal;
    // END;

    // `)
    // creamos una nueva publicación en la DB
    const create = db.execute({
      sql: 'INSERT INTO Posts (name, url) VALUES (:post_name, :post_url)',
      args: { post_name, post_url },
    })
    res.send(create)
  } catch (e) {
    console.log(e)
  }
})

app.get('/posts', async (req, res) => {
  const posts = await db.execute('SELECT * FROM Posts;')
  const postsObj = []
  posts.rows.forEach((row) => {
    postsObj.push({
      post_id: row.post_id,
      post_name: row.name,
      post_url: row.url,
      post_register_date: row.registerDate,
    })
  })
  res.json(postsObj)
})

app.delete('/posts', (req, res) => {
  const post_id = req.body.post_id
  console.log(post_id)
  try {
    const delete_register = db.execute({
      sql: 'DELETE FROM Posts WHERE post_id = :post_id',
      args: { post_id },
    })
    res.send(delete_register)
  } catch (e) {
    console.error(e)
  }
})

app.put('/update_checked', (req, res) => {
  console.log('Hola')
  console.log(req.body.value)

  const id = req.body.id
  const value = req.body.value

  const update = db.execute({
    sql: 'UPDATE Interactions SET checked = :value WHERE unique_post = :id',
    args: { id, value },
  })
  res.json({ id, value })
})

app.get('/', (req, res) => {
  res.send('Interaction Dashboard API')
})

app.listen(PORT, () => {
  console.log(`Servidor Corriendo en el puerto: ${PORT}`)
})
