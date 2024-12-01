const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3003;

// URL del microservicio de películas
const MOVIE_SERVICE_URL = 'http://movies-service:3002/movies';

app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para servir el HTML principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para obtener películas (20 películas aleatorias)
app.get('/api/movies', async (req, res) => {
  try {
    const response = await axios.get(`${MOVIE_SERVICE_URL}?count=20`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

app.listen(PORT, () => {
  console.log(`Frontend service running on http://localhost:${PORT}`);
});
