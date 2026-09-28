const params =
  new URLSearchParams(window.location.search);

const videoId =
  params.get("id");

async function loadVideo() {

  if (!videoId) {

    document.getElementById("videoTitle")
      .textContent = "Video not specified";

    return;
  }

  try {

    const response =
      await fetch(
        `${API_BASE_URL}/api/videos/${videoId}`
      );

    if (!response.ok) {
      throw new Error("Video not found");
    }

    const video =
      await response.json();

    document.title =
      `${video.title} — Navvora`;

    document.getElementById("videoTitle")
      .textContent = video.title;

    document.getElementById("videoMeta")
      .textContent =
      `${video.views || 0} views • ${video.category || "Videos"}`;

    document.getElementById("videoDescription")
      .textContent =
      video.description || "";

    // Create actual HTML5 video player
    const playerWrapper =
      document.getElementById("playerWrapper");

    playerWrapper.innerHTML = "";

    const player =
      document.createElement("video");

    player.controls = true;
    player.autoplay = false;
    player.playsInline = true;
    player.preload = "metadata";

    player.src =
      `${API_BASE_URL}/api/stream/${videoId}`;

    player.style.width = "100%";
    player.style.height = "100%";
    player.style.objectFit = "contain";
    player.style.background = "#000";

    playerWrapper.appendChild(player);

    // Count view
    await fetch(
      `${API_BASE_URL}/api/videos/${videoId}/view`,
      {
        method: "POST"
      }
    );

  } catch (error) {

    console.error(error);

    document.getElementById("videoTitle")
      .textContent =
      "Unable to load video";

  }
}

loadVideo();
