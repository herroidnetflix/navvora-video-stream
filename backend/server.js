require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const startBot = require("./bot");
const videoRoutes = require("./routes/videos");
const streamRoutes = require("./routes/stream");

const app = express();

app.use(
  cors({
    origin: "*"
  })
);

app.use(express.json());

// Health / status
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

// Video API
app.use("/api/videos", videoRoutes);

// Video streaming API
app.use("/api/stream", streamRoutes);

const PORT = process.env.PORT || 10000;

async function start() {
  try {
    if (!process.env.BOT_TOKEN) {
      throw new Error("BOT_TOKEN is missing");
    }

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing");
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected.");

    // Start Telegram bot
    startBot(process.env.BOT_TOKEN);

    // Start Express server
    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Navvora Video API running on port ${PORT}`
      );
    });

  } catch (error) {
    console.error(
      "Startup failed:",
      error
    );

    process.exit(1);
  }
}

start();
