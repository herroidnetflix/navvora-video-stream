const TelegramBot = require("node-telegram-bot-api");
const Video = require("./database");

const {
  getTelegramClient
} = require("./telegramClient");

function formatSize(bytes) {
  if (!bytes) return "Unknown";

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB"
  ];

  let size = Number(bytes);
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


/*
 * Get the actual Telegram document
 * through MTProto.
 */
async function getMTProtoDocument(msg) {
  const client =
    getTelegramClient();

  console.log(
    "Getting Telegram message through MTProto..."
  );

  /*
   * The bot is receiving the message
   * from the same private chat.
   */
  const messages =
    await client.getMessages(
      String(msg.chat.id),
      {
        ids: [msg.message_id]
      }
    );

  if (
    !messages ||
    !messages.length
  ) {
    throw new Error(
      "MTProto could not find the Telegram message."
    );
  }

  const telegramMessage =
    messages[0];

  console.log(
    "MTProto message found."
  );

  /*
   * Telegram media can be represented
   * as a document.
   */
  const document =
    telegramMessage?.media?.document;

  if (!document) {
    throw new Error(
      "The Telegram message does not contain a document."
    );
  }

  if (!document.id) {
    throw new Error(
      "Telegram document ID is missing."
    );
  }

  if (!document.accessHash) {
    throw new Error(
      "Telegram document access hash is missing."
    );
  }

  if (!document.fileReference) {
    throw new Error(
      "Telegram file reference is missing."
    );
  }

  console.log(
    "MTProto document obtained."
  );

  return {
    documentId:
      document.id.toString(),

    accessHash:
      document.accessHash.toString(),

    fileReference:
      Buffer.from(
        document.fileReference
      ).toString("base64")
  };
}


function startBot(token) {

  const bot =
    new TelegramBot(
      token,
      {
        polling: true
      }
    );


  // =============================
  // START COMMAND
  // =============================

  bot.onText(
    /^\/start$/,
    async (msg) => {

      try {

        await bot.sendMessage(
          msg.chat.id,
          [
            "🎬 Welcome to Navvora Video!",
            "",
            "Send me a video and it will be added to your video library.",
            "",
            "💡 Use the video caption as its title."
          ].join("\n")
        );

      } catch (error) {

        console.error(
          "Start message error:",
          error
        );

      }

    }
  );


  // =============================
  // VIDEO RECEIVED
  // =============================

  bot.on(
    "video",
    async (msg) => {

      try {

        const video =
          msg.video;

        if (!video) {
          return;
        }

        console.log(
          "Video received:",
          video.file_name ||
          "Unnamed video"
        );


        // =============================
        // DUPLICATE CHECK
        // =============================

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


        // =============================
        // GET MTProto INFORMATION
        // =============================

        const mtprotoDocument =
          await getMTProtoDocument(
            msg
          );


        console.log(
          "Document ID:",
          mtprotoDocument.documentId
        );


        // =============================
        // TITLE
        // =============================

        const title =
          msg.caption &&
          msg.caption.trim()
            ? msg.caption.trim()
            : video.file_name ||
              "Untitled Video";


        // =============================
        // SAVE TO MONGODB
        // =============================

        const saved =
          await Video.create({

            title,

            description:
              "",

            category:
              "Videos",


            // Telegram chat
            telegramChatId:
              String(msg.chat.id),


            // Telegram message
            telegramMessageId:
              msg.message_id,


            // Bot API file ID
            telegramFileId:
              video.file_id,


            // Unique file ID
            telegramFileUniqueId:
              video.file_unique_id,


            // =============================
            // MTProto DATA
            // =============================

            telegramDocumentId:
              mtprotoDocument.documentId,

            telegramAccessHash:
              mtprotoDocument.accessHash,

            telegramFileReference:
              mtprotoDocument.fileReference,


            // =============================
            // FILE DATA
            // =============================

            fileName:
              video.file_name ||
              "",

            mimeType:
              "video/mp4",

            fileSize:
              video.file_size ||
              0,

            duration:
              video.duration ||
              0,

            views:
              0

          });


        console.log(
          "Video saved with MTProto information."
        );


        // =============================
        // WATCH URL
        // =============================

        const watchUrl =
          `${process.env.FRONTEND_URL}/watch.html?id=${saved._id}`;


        // =============================
        // SEND CONFIRMATION
        // =============================

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
            [
              "❌ Could not add this video.",
              "",
              "MTProto could not obtain the Telegram file information.",
              "",
              `Error: ${error.message}`
            ].join("\n")
          );

        } catch (sendError) {

          console.error(
            "Failed to send error message:",
            sendError
          );

        }

      }

    }
  );


  console.log(
    "Telegram bot started."
  );

  return bot;
}


module.exports =
  startBot;
