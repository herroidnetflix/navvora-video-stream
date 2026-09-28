let videos = [];

async function loadVideos() {
  const grid = document.getElementById("videoGrid");

  try {
    const response = await fetch(`${API_BASE_URL}/api/videos`);
    if (!response.ok) throw new Error("Failed to load videos");

    videos = await response.json();
    renderVideos(videos);
  } catch (error) {
    console.error(error);
    grid.innerHTML = `<div class="empty">Unable to load videos. Check the API URL.</div>`;
  }
}

function renderVideos(list) {
  const grid = document.getElementById("videoGrid");

  if (!list.length) {
    grid.innerHTML = `<div class="empty">No videos have been added yet.</div>`;
    return;
  }

  grid.innerHTML = list.map(video => `
    <article class="video-card" onclick="openVideo('${video._id}')">
      <div class="poster">
        <div class="poster-placeholder">▶</div>
        <span class="duration">${formatDuration(video.duration)}</span>
      </div>
      <div class="video-info">
        <h3>${escapeHTML(video.title)}</h3>
        <p>${video.views || 0} views</p>
      </div>
    </article>
  `).join("");
}

function openVideo(id) {
  window.location.href = `watch.html?id=${encodeURIComponent(id)}`;
}

function formatDuration(seconds) {
  if (!seconds) return "--:--";
  seconds = Number(seconds);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.getElementById("searchInput").addEventListener("input", event => {
  const query = event.target.value.toLowerCase().trim();

  if (!query) {
    renderVideos(videos);
    return;
  }

  renderVideos(
    videos.filter(video =>
      video.title.toLowerCase().includes(query)
    )
  );
});

loadVideos();
