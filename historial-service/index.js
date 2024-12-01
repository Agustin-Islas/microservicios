require('dotenv').config();
const express = require('express');
const amqp = require('amqplib');
const cors = require('cors'); // Importar CORS


const app = express();
const PORT = process.env.PORT || 3004;
const QUEUE_NAME = process.env.QUEUE_NAME || 'movies_queue';

let channel;

// Usar CORS para permitir solicitudes desde cualquier origen
app.use(cors());  // Esto permite todas las solicitudes CORS de cualquier origen

// Función para conectar a RabbitMQ con reintentos
async function connectRabbitMQ() {
  let attempt = 0;
  const maxAttempts = 10;
  const delay = 10000;

  while (attempt < maxAttempts) {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq');
      channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME);
      console.log(`RabbitMQ conectado y cola '${QUEUE_NAME}' configurada.`);
      return; // Exit the loop if the connection is successful
    } catch (err) {
      attempt++;
      console.error(`Error al conectar con RabbitMQ (Intento ${attempt}/${maxAttempts}):`, err);
      if (attempt < maxAttempts) {
        console.log(`Reintentando en ${delay / 1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('Maximo número de intentos alcanzado. Saliendo.');
        process.exit(1); // Exit the process if max attempts reached
      }
    }
  }
}

// Endpoint para recibir eventos de clic
app.use(express.json());

app.post('/api/click', (req, res) => {
  const eventData = req.body;

  if (!eventData || !eventData.movieId) {
    return res.status(400).send({ message: 'Datos inválidos.' });
  }

  channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(eventData)));
  console.log('Evento recibido y enviado a la cola:', eventData);

  res.send({ message: 'Evento recibido.' });
});

// Iniciar servidor y conectar a RabbitMQ
app.listen(PORT, async () => {
  console.log(`Historial-service corriendo en el puerto ${PORT}`);
  await connectRabbitMQ(); // Intentar conectar a RabbitMQ antes de arrancar el servidor
});
