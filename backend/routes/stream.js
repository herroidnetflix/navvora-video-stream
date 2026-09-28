const express = require("express");
const axios = require("axios");
const Video = require("../database");

const router = express.Router();

router.get("/:id", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).send("Video not found");
    }

    if (!video.telegramFileId) {
      return res.status(404).send("Telegram file ID not found");
    }

    // Ask Telegram for the file path
    const telegramResponse = await axios.get(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile`,
      {
        params: {
          file_id: video.telegramFileId
        }
      }
    );

    if (
      !telegramResponse.data.ok ||
      !telegramResponse.data.result.file_path
    ) {
      return res.status(500).send(
        "Telegram could not provide the file"
      );
    }

    const filePath =
      telegramResponse.data.result.file_path;

    const telegramFileUrl =
      `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;

    // Download the file from Telegram
    const fileResponse = await axios.get(
      telegramFileUrl,
      {
        responseType: "stream"
      }
    );

    res.setHeader(
      "Content-Type",
      video.mimeType || "video/mp4"
    );

    if (video.fileSize) {
      res.setHeader(
        "Content-Length",
        video.fileSize
      );
    }

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(
        video.fileName || "video.mp4"
      )}"`
    );

    fileResponse.data.pipe(res);

  } catch (error) {
    console.error(
      "Streaming error:",
      error.response?.data || error.message
    );

    if (!res.headersSent) {
      res.status(500).send(
        "Unable to stream video"
      );
    }
  }
});

module.exports = router;
