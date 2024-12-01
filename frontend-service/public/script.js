document.addEventListener('DOMContentLoaded', async () => {
  const moviesGrid = document.getElementById('movies-grid');
  const recommendationsGrid = document.getElementById('recommendations');
  const refreshButton = document.getElementById('refresh-button');

  let overlay;
  let previousRecommendations = []; // Estado previo de las recomendaciones

  async function loadOverlay() {
    overlay = document.getElementById('movie-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'movie-overlay';
      overlay.style.display = 'none';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      overlay.style.color = 'white';
      overlay.style.zIndex = '1000';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.flexDirection = 'column';
      overlay.style.display = 'flex';
      document.body.appendChild(overlay);
    }

    overlay.addEventListener('click', () => {
      overlay.style.display = 'none';
    });
  }

  function showOverlay(movie, img) {
    const rect = img.getBoundingClientRect();
    const offsetTop = rect.top + window.scrollY;

    overlay.style.top = `${offsetTop + rect.height / 2 - overlay.offsetHeight / 2}px`;
    overlay.innerHTML = `
      <div>
        <h3>${movie.title}</h3>
        <p>${movie.overview}</p>
        <small>Haz clic en cualquier parte para cerrar</small>
      </div>
    `;
    overlay.style.display = 'flex';
  }

  async function loadMovies() {
    try {
      const response = await fetch('/api/movies');
      const movies = await response.json();
      moviesGrid.innerHTML = '';

      movies.forEach(group => {
        group.forEach(movie => {
          const movieElement = document.createElement('div');
          movieElement.classList.add('movie');
          const posterPath = movie.poster_path
            ? `https://image.tmdb.org/t/p/w500/${movie.poster_path}`
            : 'ruta/a/imagen/por_defecto.jpg';
          const img = document.createElement('img');
          img.src = posterPath;
          img.alt = movie.title;
          img.title = movie.title;
          img.classList.add('movie-poster');
          movieElement.appendChild(img);

          img.addEventListener('click', async () => {
            try {
              const response = await fetch('http://localhost:3004/api/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieId: movie.id, genre_ids: movie.genre_ids }),
              });
              if (!response.ok) {
                console.error('Error al enviar el evento:', await response.text());
              }
            } catch (error) {
              console.error('Error al conectar con historial-service:', error);
            }

            showOverlay(movie, img);
          });

          moviesGrid.appendChild(movieElement);
        });
      });
    } catch (error) {
      console.error('Error al obtener las películas:', error);
      moviesGrid.innerHTML = '<p>Failed to load movies.</p>';
    }
  }

  async function loadRecommendedMovies() {
    try {
      const response = await fetch('http://localhost:3005/api/recomendacion');
      const recommendedMovies = await response.json();
      const limitedMovies = recommendedMovies.slice(0, 5);

      // Verificar si las recomendaciones cambiaron
      if (JSON.stringify(limitedMovies) === JSON.stringify(previousRecommendations)) {
        return; // No actualizar si no hay cambios
      }
      previousRecommendations = limitedMovies; // Actualizar el estado previo

      recommendationsGrid.innerHTML = '';

      if (limitedMovies.length === 0) {
        recommendationsGrid.innerHTML = '<p>No recommendations yet.</p>';
        return;
      }

      limitedMovies.forEach(movie => {
        const movieElement = document.createElement('div');
        movieElement.classList.add('movie');
        const posterPath = movie.poster_path
          ? `https://image.tmdb.org/t/p/w500/${movie.poster_path}`
          : 'ruta/a/imagen/por_defecto.jpg';
        const img = document.createElement('img');
        img.src = posterPath;
        img.alt = movie.title;
        img.title = movie.title;
        img.classList.add('movie-poster');
        movieElement.appendChild(img);

        img.addEventListener('click', () => {
          showOverlay(movie, img);
        });

        recommendationsGrid.appendChild(movieElement);
      });
    } catch (error) {
      console.error('Error al obtener las películas recomendadas:', error);
      recommendationsGrid.innerHTML = '<p>Nothing to recommend yet</p>';
    }
  }

  refreshButton.addEventListener('click', loadMovies);

  await loadOverlay();
  await loadMovies();
  await loadRecommendedMovies();

  // Actualizar recomendaciones automáticamente cada 2 segundos
  setInterval(loadRecommendedMovies, 1000);
});
