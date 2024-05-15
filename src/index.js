const express = require('express')
// import express from "express"
const dotenv = require('dotenv')
// import dotenv from "dotenv"
const { createClient } = require('@libsql/client')
// import { createClient } from "@libsql/client"

const app = express()
app.use(express.json())
const PORT = process.env.port || 3000

dotenv.config()
// Conexión con la base de datos
const db = createClient({
  url: 'libsql://positive-screwball-jesuswav.turso.io',
  authToken: process.env.DB_TOKEN,
})

app.get('/registros', async (req, res) => {
  let usuariosConPublicaciones = {}

  try {
    const name = 'Jesus'
    console.log('Ejecutando el try')
    const results = await db.execute(`
    SELECT
      Personal.personal_id,
      Personal.name AS personal_name,
      Posts.post_id,
      Posts.name AS post_name,
      Posts.registerDate
    FROM
      Personal
      LEFT JOIN Interactions ON Personal.personal_id = Interactions.personal_id
      LEFT JOIN Posts ON Interactions.post_id = Posts.post_id
    ORDER BY
      Personal.personal_id,
      Posts.post_id;`)

    results.rows.forEach((row) => {
      console.log(
        row.personal_name,
        row.personal_id,
        row.post_name,
        row.registerDate
      )

      if (!usuariosConPublicaciones[row.personal_id]) {
        // Si no existe, crea una nueva entrada para el usuario
        usuariosConPublicaciones[row.personal_id] = {
          personal_id: row.personal_id,
          personal_name: row.personal_name,
          publicaciones: [],
        }
      }

      // Añade la publicación actual al array de publicaciones del usuario
      usuariosConPublicaciones[row.personal_id].publicaciones.push({
        post_id: row.post_id,
        post_name: row.post_name,
        registerDate: row.registerDate,
      })
    })
  } catch (e) {
    console.error(e)
  }
  res.json(Object.values(usuariosConPublicaciones))
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

app.post('/posts', async (req, res) => {
  const post_name = req.body.post_name
  const post_url = req.body.post_url
  console.log(post_name)
  console.log(post_url)
  try {
    // creamos el trigger para la relación
    const trigger = db.execute(`
    CREATE TRIGGER crear_interaccion_despues_de_insertar
    AFTER INSERT ON Posts
    FOR EACH ROW
    BEGIN
      INSERT INTO Interactions (personal_id, post_id)
      SELECT personal_id, NEW.post_id FROM Personal;
    END;
    
    `)
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

app.get('/', (req, res) => {
  res.send('Interaction Dashboard API')
})

app.listen(PORT, () => {
  console.log(`Servidor Corriendo en el puerto: ${PORT}`)
})
