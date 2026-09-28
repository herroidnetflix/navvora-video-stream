require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const startBot = require("./bot");
const videoRoutes = require("./routes/videos");
const streamRoutes = require("./routes/stream");
const {
  startTelegramClient
} = require("./telegramClient");

const app = express();

app.use(
  cors({
    origin: "*"
  })
);

app.use(express.json());

// -----------------------------
// Basic API routes
// -----------------------------

app.get("/", (req, res) => {
  res.json({
    name: "Navvora Video API",
    status: "online"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

// -----------------------------
// Video routes
// -----------------------------

app.use("/api/videos", videoRoutes);

// -----------------------------
// Streaming routes
// -----------------------------

app.use("/api/stream", streamRoutes);

// -----------------------------
// Start server
// -----------------------------

const PORT = process.env.PORT || 10000;

async function start() {
  try {
    // Check required environment variables
    if (!process.env.BOT_TOKEN) {
      throw new Error("BOT_TOKEN is missing");
    }

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing");
    }

    if (!process.env.TELEGRAM_API_ID) {
      throw new Error("TELEGRAM_API_ID is missing");
    }

    if (!process.env.TELEGRAM_API_HASH) {
      throw new Error("TELEGRAM_API_HASH is missing");
    }

    // -----------------------------
    // MongoDB
    // -----------------------------

    await mongoose.connect(
      process.env.MONGODB_URI
    );

    console.log(
      "MongoDB connected."
    );

    // -----------------------------
    // Telegram MTProto
    // -----------------------------

    await startTelegramClient();

    // -----------------------------
    // Telegram Bot API
    // -----------------------------

    startBot(
      process.env.BOT_TOKEN
    );

    // -----------------------------
    // Express
    // -----------------------------

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `Navvora Video API running on port ${PORT}`
        );
      }
    );

  } catch (error) {
    console.error(
      "Startup failed:",
      error
    );

    process.exit(1);
  }
}

start();
