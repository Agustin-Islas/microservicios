require('dotenv').config();
const express = require('express');
const axios = require('axios');
const amqp = require('amqplib');
const _ = require('lodash'); // Para trabajar con arrays más fácilmente
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3005;
const QUEUE_NAME = process.env.QUEUE_NAME || 'movies_queue';
let channel;
let movies = [];
let recommendedList = [];  // Lista de películas recomendadas
let recommendedMovie = null;  // Variable para almacenar la película recomendada

app.use(cors());

// Función para intentar conectar con RabbitMQ con reintentos
async function connectRabbitMQ(retries = 10, delay = 10000) {
  let attempt = 0;

  while (attempt < retries) {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq');
      channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME);
      console.log(`Conectado a RabbitMQ y cola '${QUEUE_NAME}' configurada.`);
      // Consumir mensajes de la cola
      channel.consume(QUEUE_NAME, (msg) => {
        if (msg !== null) {
          const movieData = JSON.parse(msg.content.toString());
          console.log('Nuevo evento recibido:', movieData);
          processNewMovie(movieData);
          channel.ack(msg);
        }
      });
      return; // Salir de la función cuando la conexión sea exitosa
    } catch (err) {
      attempt++;
      console.error(`Error al conectar con RabbitMQ. Intento ${attempt} de ${retries}:`, err);
      if (attempt < retries) {
        console.log(`Reintentando en ${delay / 1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));  // Esperar el tiempo de reintento
      } else {
        console.error('No se pudo conectar a RabbitMQ después de varios intentos.');
        process.exit(1);  // Salir si no se pudo conectar después de los reintentos
      }
    }
  }
}

// Función para intentar obtener películas desde la base de datos con reintentos
async function fetchMoviesFromDatabase(retries = 10, delay = 20000) {
  let attempt = 0;

  while (attempt < retries) {
    try {
      const response = await axios.get('http://database-service:3001/movies');
      movies = response.data;  // Guardamos las películas obtenidas
      console.log('Películas cargadas desde database-service.');
      return;  // Salir de la función cuando la conexión sea exitosa
    } catch (err) {
      attempt++;
      console.error(`Error al obtener las películas. Intento ${attempt} de ${retries}:`, err);
      if (attempt < retries) {
        console.log(`Reintentando en ${delay / 1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));  // Esperar el tiempo de reintento
      } else {
        console.error('No se pudo obtener las películas después de varios intentos.');
        process.exit(1);  // Salir si no se pudo obtener las películas después de los reintentos
      }
    }
  }
}

// Filtrar las películas que coinciden con los géneros de la nueva película
function getMoviesByGenres(genreIds) {
    return movies
      .map((movie) => {
        // Encontrar cuántos géneros coinciden entre la película y la nueva película
        const commonGenresCount = _.intersection(movie.genre_ids, genreIds).length;
  
        // Solo devolver películas que tienen al menos un género en común
        if (commonGenresCount > 0) {
          return {
            movie,
            commonGenresCount,  // Contador de géneros comunes
          };
        }
        return null;  // Si no hay coincidencias, no incluir esta película
      })
      .filter((movie) => movie !== null)  // Filtrar las películas que no tienen coincidencias
      .sort((a, b) => b.commonGenresCount - a.commonGenresCount)  // Ordenar de mayor a menor coincidencias
      .slice(0, 20)  // Retornar solo las 20 mejores coincidencias
      .map((movie) => movie.movie);  // Retornar solo las películas, sin el contador
  }
  

// Seleccionar aleatoriamente una película de las que coinciden
function selectRandomMovie(matchingMovies) {
  if (matchingMovies.length > 0) {
    const randomIndex = Math.floor(Math.random() * matchingMovies.length);
    return matchingMovies[randomIndex];
  }
  return null;
}

// Procesar la nueva película recibida desde RabbitMQ
async function processNewMovie(movieData) {
  const { movieId, genre_ids } = movieData;

  // Buscar películas que coincidan con los géneros de la nueva película
  const matchingMovies = getMoviesByGenres(genre_ids);

  // Seleccionar una película aleatoriamente
  recommendedMovie = selectRandomMovie(matchingMovies);

  if (recommendedMovie) {
    // Agregar la película recomendada al comienzo de la lista
    recommendedList.unshift(recommendedMovie);
  } else {
    console.log('No se encontró una película recomendada.');
  }
}

// Endpoint para obtener las películas recomendadas
app.get('/api/recomendacion', (req, res) => {
  if (recommendedList.length === 0) {
    return res.status(404).send({ message: 'No hay películas recomendadas disponibles.' });
  }
  res.send(recommendedList);  // Retorna la lista de películas recomendadas
});

// Iniciar servidor y conectar a RabbitMQ
app.listen(PORT, async () => {
  console.log(`Recomendador-service corriendo en el puerto ${PORT}`);
  await fetchMoviesFromDatabase();  // Cargar todas las películas al iniciar
  await connectRabbitMQ();         // Conectar a RabbitMQ para recibir mensajes
});
