require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const startBot = require("./bot");
const videoRoutes = require("./routes/videos");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "Navvora Video API",
    status: "online"
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/videos", videoRoutes);

const PORT = process.env.PORT || 10000;

async function start() {
  if (!process.env.BOT_TOKEN) {
    throw new Error("BOT_TOKEN is missing");
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected.");

  startBot(process.env.BOT_TOKEN);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Navvora API listening on ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Startup failed:", error);
  process.exit(1);
});
