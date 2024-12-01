const axios = require('axios');
const { MongoClient } = require('mongodb');

// Configuración de MongoDB
const MONGO_URI = 'mongodb://mongodb:27017';
const DATABASE_NAME = 'moviesdb';
const COLLECTION_NAME = 'movies';

// Configuración de la API de TMDB
const API_KEY = 'a62c0a410ee8eb9681a308ef72650f46';
const API_URL = 'https://api.themoviedb.org/3';
const HEADERS = {
  Authorization: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhNjJjMGE0MTBlZThlYjk2ODFhMzA4ZWY3MjY1MGY0NiIsIm5iZiI6MTczMjA1MTk4NS42MDgxNTY0LCJzdWIiOiI2NzJjZDQzNDI2YjYwNWJjMTllNWNiOGYiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.iucGydbEIx-ksgcTCdpKKUcNABn6XOncXynCKyF5nsg`
};

// Función para obtener las primeras 2000 películas de TMDB
async function fetchAllMovies() {
  let movies = [];
  let page = 1;
  let totalPages = 1;
  const maxMovies = 2000;  // Limitar a las primeras n películas

  console.log('Iniciando descarga de películas...');

  while (page <= totalPages && movies.length < maxMovies) {
    try {
      const response = await axios.get(`${API_URL}/movie/popular`, {
        headers: HEADERS,
        params: { api_key: API_KEY, page }
      });

      const { results, total_pages } = response.data;
      movies = movies.concat(results);

      // Si ya hemos alcanzado las 2000 películas, detener la descarga
      if (movies.length >= maxMovies) {
        movies = movies.slice(0, maxMovies);  // Asegurarse de que no exceda las 4000
        break;
      }

      totalPages = total_pages;
      page++;
    } catch (error) {
      console.error(`Error al obtener la página ${page}:`, error.message);
      break;
    }
  }

  console.log(`Se han descargado ${movies.length} películas en total.`);
  return movies;
}

// Función para poblar la base de datos
async function poblarBaseDeDatos() {
  try {
    // Conectar a MongoDB
    const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
    await client.connect();
    console.log('Conectado a MongoDB');

    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Limpiar la colección si ya existe
    await collection.deleteMany({});
    console.log('Colección limpia');

    // Obtener las primeras 4000 películas de la API
    const movies = await fetchAllMovies();

    // Transformar las películas según el formato requerido y asignar nuevos IDs
    const transformedMovies = movies.map((movie, index) => ({
      ...movie, // Incluye todos los atributos originales de la API
      id: index, // Asigna un nuevo ID secuencial
      fetched_at: new Date().toISOString() // Campo adicional: fecha de importación
    }));

    // Insertar las películas transformadas en la base de datos
    const resultado = await collection.insertMany(transformedMovies);
    console.log(`Se han insertado ${resultado.insertedCount} películas en la base de datos.`);

    // Cerrar conexión
    await client.close();
    console.log('Conexión cerrada');
  } catch (error) {
    console.error('Error al poblar la base de datos:', error);
  }
}

poblarBaseDeDatos();
