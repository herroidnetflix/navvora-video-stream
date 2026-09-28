const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    category: {
      type: String,
      default: "Videos"
    },

    // Telegram information
    telegramChatId: {
      type: String,
      required: true
    },

    telegramMessageId: {
      type: Number,
      required: true
    },

    telegramFileId: {
      type: String,
      required: true
    },

    telegramFileUniqueId: {
      type: String,
      default: ""
    },

    // MTProto document information
    telegramDocumentId: {
      type: String,
      default: ""
    },

    telegramAccessHash: {
      type: String,
      default: ""
    },

    telegramFileReference: {
      type: String,
      default: ""
    },

    fileName: {
      type: String,
      default: ""
    },

    mimeType: {
      type: String,
      default: "video/mp4"
    },

    fileSize: {
      type: Number,
      default: 0
    },

    duration: {
      type: Number,
      default: 0
    },

    thumbnail: {
      type: String,
      default: ""
    },

    views: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.model("Video", videoSchema);
