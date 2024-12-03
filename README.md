Descripción de los Servicios

database-service:
Este servicio consume la API de películas y carga las primeras 2000 películas en una base de datos MongoDB. Su objetivo es centralizar la información de las películas para su uso posterior por otros servicios.

movies-service:
El servicio movies-service obtiene 20 películas aleatorias de database-service y las expone a través de un endpoint. Este endpoint permite a otros servicios acceder a un conjunto de películas aleatorias para su visualización.

frontend-service:
El servicio frontend consume el endpoint de movies-service y presenta las 20 películas aleatorias en la interfaz de usuario. Además, actualiza el panel de recomendaciones cada vez que se añade una nueva película recomendada, mostrando como máximo las últimas 5 recomendaciones.

historial-service:
Cada vez que un usuario selecciona una película desde el panel, el historial-service guarda el ID y los géneros asociados de la película en una cola de RabbitMQ. Esta cola servirá como entrada para el servicio de recomendaciones.

recomendador-service:
El servicio recomendador-service se suscribe a la cola de RabbitMQ donde se reciben las películas seleccionadas. Cada vez que una nueva película es añadida a la cola, el servicio:

Obtiene todas las películas de la base de datos.
Calcula un valor de coincidencia para cada película en función de los géneros en común con la nueva película de la cola.
Selecciona aleatoriamente una película de entre las 20 películas con mayor coincidencia.
Guarda la nueva recomendación en un array que se expone a través de un endpoint de recomendaciones, el cual es consumido por el servicio frontend para mostrar las recomendaciones actualizadas.
