const params = new URLSearchParams(window.location.search);
const videoId = params.get("id");

async function loadVideo() {
  if (!videoId) {
    document.getElementById("videoTitle").textContent = "Video not specified";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}`);

    if (!response.ok) throw new Error("Video not found");

    const video = await response.json();

    document.title = `${video.title} — Navvora`;
    document.getElementById("videoTitle").textContent = video.title;
    document.getElementById("videoMeta").textContent =
      `${video.views || 0} views • ${video.category || "Videos"}`;
    document.getElementById("videoDescription").textContent =
      video.description || "";

    await fetch(`${API_BASE_URL}/api/videos/${videoId}/view`, {
      method: "POST"
    });
  } catch (error) {
    console.error(error);
    document.getElementById("videoTitle").textContent =
      "Unable to load video";
    document.getElementById("playerTitle").textContent =
      "Video unavailable";
    document.getElementById("playerMessage").textContent =
      "Check the backend connection.";
  }
}

loadVideo();
