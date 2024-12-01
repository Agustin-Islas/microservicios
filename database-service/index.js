const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3001;

const MONGO_URI = 'mongodb://mongodb:27017';
const DATABASE_NAME = 'moviesdb';
const COLLECTION_NAME = 'movies';

let db;

async function startServer() {
  try {
    // Conexión a MongoDB
    const client = await MongoClient.connect(MONGO_URI, { useUnifiedTopology: true });
    console.log('Connected to MongoDB');
    db = client.db(DATABASE_NAME);

    // Endpoint para obtener películas (todas o filtradas por id)
    app.get('/movies', async (req, res) => {
      try {
        const { id } = req.query; // Capturar el parámetro `id` si existe

        // Crear una consulta basada en el parámetro `id`
        const query = id ? { id: parseInt(id, 10) } : {}; // Si no hay `id`, devuelve todas las películas
        const movies = await db.collection(COLLECTION_NAME).find(query).toArray();

        res.json(movies);
      } catch (error) {
        console.error('Error en /movies:', error);
        res.status(500).json({ error: 'Failed to fetch movies' });
      }
    });

    // Endpoint para obtener el rango válido de IDs
    app.get('/rangoMovies', async (req, res) => {
      try {
        const rangoMovies = await db.collection(COLLECTION_NAME).aggregate([
          {
            $group: {
              _id: null,
              minId: { $min: "$id" },
              maxId: { $max: "$id" }
            }
          }
        ]).toArray();

        res.json(rangoMovies[0]); // Devuelve solo el objeto con minId y maxId
      } catch (error) {
        console.error('Error en /rangoMovies:', error);
        res.status(500).json({ error: 'Failed to fetch rangoMovies' });
      }
    });

    app.listen(PORT, () => {
      console.log(`Database service running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

startServer();
