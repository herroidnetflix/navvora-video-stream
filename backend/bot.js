const TelegramBot = require("node-telegram-bot-api");
const Video = require("./database");

function formatSize(bytes) {
  if (!bytes) return "Unknown";

  const units = ["B", "KB", "MB", "GB", "TB"];

  let size = bytes;
  let i = 0;

  while (
    size >= 1024 &&
    i < units.length - 1
  ) {
    size /= 1024;
    i++;
  }

  return `${size.toFixed(2)} ${units[i]}`;
}

function startBot(token) {
  const bot = new TelegramBot(token, {
    polling: true
  });

  // -----------------------------
  // /start
  // -----------------------------

  bot.onText(/^\/start$/, async (msg) => {
    try {
      await bot.sendMessage(
        msg.chat.id,
        [
          "🎬 Welcome to Navvora Video!",
          "",
          "Send me a video and it will be added to your video library.",
          "",
          "💡 Tip:",
          "Use the video caption as its title."
        ].join("\n")
      );
    } catch (error) {
      console.error(
        "Start message error:",
        error
      );
    }
  });

  // -----------------------------
  // Video received
  // -----------------------------

  bot.on("video", async (msg) => {
    try {
      const video = msg.video;

      if (!video) {
        return;
      }

      console.log(
        "Video received:",
        video.file_name || "Unnamed video"
      );

      // -----------------------------
      // Check duplicate
      // -----------------------------

      const existing =
        await Video.findOne({
          telegramFileUniqueId:
            video.file_unique_id
        });

      if (existing) {
        await bot.sendMessage(
          msg.chat.id,
          [
            "🎬 This video is already in your library.",
            "",
            `🎞️ ${existing.title}`,
            "",
            "▶️ Watch:",
            `${process.env.FRONTEND_URL}/watch.html?id=${existing._id}`
          ].join("\n")
        );

        return;
      }

      // -----------------------------
      // Title
      // -----------------------------

      const title =
        msg.caption &&
        msg.caption.trim()
          ? msg.caption.trim()
          : video.file_name ||
            "Untitled Video";

      // -----------------------------
      // Save video information
      // -----------------------------

      const saved =
        await Video.create({
          title,

          description:
            "",

          category:
            "Videos",

          // Telegram chat where the
          // original video message exists
          telegramChatId:
            String(msg.chat.id),

          // Telegram message ID
          telegramMessageId:
            msg.message_id,

          // Bot API file ID
          telegramFileId:
            video.file_id,

          // Unique ID
          telegramFileUniqueId:
            video.file_unique_id,

          // Original filename
          fileName:
            video.file_name || "",

          mimeType:
            "video/mp4",

          fileSize:
            video.file_size || 0,

          duration:
            video.duration || 0,

          views:
            0
        });

      // -----------------------------
      // Watch URL
      // -----------------------------

      const watchUrl =
        `${process.env.FRONTEND_URL}/watch.html?id=${saved._id}`;

      // -----------------------------
      // Confirmation
      // -----------------------------

      await bot.sendMessage(
        msg.chat.id,
        [
          "🎬 VIDEO ADDED",
          "",
          `🎞️ ${title}`,
          `📦 ${formatSize(
            video.file_size || 0
          )}`,
          "",
          `⏱️ Duration: ${
            video.duration || 0
          } seconds`,
          "",
          "▶️ Watch Online:",
          watchUrl
        ].join("\n")
      );

    } catch (error) {
      console.error(
        "Video processing error:",
        error
      );

      try {
        await bot.sendMessage(
          msg.chat.id,
          "❌ Could not add this video. Check the server logs."
        );
      } catch (sendError) {
        console.error(
          "Telegram error message failed:",
          sendError
        );
      }
    }
  });

  console.log(
    "Telegram bot started."
  );

  return bot;
}

module.exports = startBot;
