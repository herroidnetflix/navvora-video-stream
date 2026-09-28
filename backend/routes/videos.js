const express = require("express");
const Video = require("../database");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const videos = await Video.find()
      .sort({ createdAt: -1 })
      .select("-telegramFileId");

    res.json(videos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load videos" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.json(video);
  } catch (error) {
    res.status(500).json({ error: "Failed to load video" });
  }
});

router.post("/:id/view", async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.json({ views: video.views });
  } catch (error) {
    res.status(500).json({ error: "Failed to update views" });
  }
});

module.exports = router;
