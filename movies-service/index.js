const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3002;

// URL del microservicio de datos
const DATABASE_SERVICE_URL = 'http://database-service:3001/movies';
const RANGO_DATABASE_SERVICE_URL = 'http://database-service:3001/rangoMovies';

// Endpoint para obtener una cantidad específica de películas dentro del rango válido
app.get('/movies', async (req, res) => {
  try {
    // Obtener el rango válido de IDs
    const rangoResponse = await axios.get(RANGO_DATABASE_SERVICE_URL);
    const { minId, maxId } = rangoResponse.data;

    const N = 20; // Por defecto, devolver 20 películas
    if (N < 1 || N > maxId - minId + 1) {
      return res.status(400).json({ error: 'Invalid count parameter' });
    }

    // Generar un conjunto aleatorio de IDs dentro del rango
    const ids = new Set();  // Usamos un Set para evitar duplicados automáticamente
    while (ids.size < N) {
      const randomId = Math.floor(Math.random() * (maxId - minId + 1)) + minId;
      ids.add(randomId);  // Set automáticamente maneja duplicados
    }

    // Convertir el Set a un Array
    const uniqueIds = Array.from(ids);

    // Solicitar las películas para los IDs seleccionados
    const moviePromises = uniqueIds.map(id => axios.get(`${DATABASE_SERVICE_URL}?id=${id}`));
    const movieResponses = await Promise.all(moviePromises);

    // Transformar las respuestas en el formato deseado
    const movies = movieResponses.map(response => response.data);

    res.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

app.listen(PORT, () => {
  console.log(`Movies service running on http://localhost:${PORT}`);
});
