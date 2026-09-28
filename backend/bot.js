const TelegramBot = require("node-telegram-bot-api");
const Video = require("./database");

function formatSize(bytes) {
  if (!bytes) return "Unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(2)} ${units[i]}`;
}

function startBot(token) {
  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/^\/start$/, async (msg) => {
    await bot.sendMessage(
      msg.chat.id,
      [
        "🎬 Welcome to Navvora Video!",
        "",
        "Send me a video and it will be added to your video catalog.",
        "",
        "Use the video caption as its title."
      ].join("\n")
    );
  });

  bot.on("video", async (msg) => {
    try {
      const video = msg.video;
      if (!video) return;

      const existing = await Video.findOne({
        telegramFileUniqueId: video.file_unique_id
      });

      if (existing) {
        return bot.sendMessage(
          msg.chat.id,
          `🎬 Already added.\n\n▶️ Watch:\n${process.env.FRONTEND_URL}/watch.html?id=${existing._id}`
        );
      }

      const title =
        (msg.caption && msg.caption.trim()) ||
        video.file_name ||
        "Untitled Video";

      const saved = await Video.create({
        title,
        telegramChatId: String(msg.chat.id),
        telegramMessageId: msg.message_id,
        telegramFileId: video.file_id,
        telegramFileUniqueId: video.file_unique_id,
        fileName: video.file_name || "",
        mimeType: "video/mp4",
        fileSize: video.file_size || 0,
        duration: video.duration || 0
      });

      const watchUrl =
        `${process.env.FRONTEND_URL}/watch.html?id=${saved._id}`;

      await bot.sendMessage(
        msg.chat.id,
        [
          "🎬 VIDEO ADDED",
          "",
          `🎞️ ${title}`,
          `📦 ${formatSize(video.file_size || 0)}`,
          "",
          `▶️ Watch Online:`,
          watchUrl
        ].join("\n")
      );
    } catch (error) {
      console.error("Video processing error:", error);
      await bot.sendMessage(
        msg.chat.id,
        "❌ Could not add this video."
      );
    }
  });

  console.log("Telegram bot started.");
}

module.exports = startBot;
