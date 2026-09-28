const express = require("express");
const Video = require("../database");
const {
  getTelegramClient
} = require("../telegramClient");

const {
  Api
} = require("telegram");

const router = express.Router();

const CHUNK_SIZE = 1024 * 1024; // 1 MB

function parseRange(range, fileSize) {
  if (!range) {
    return {
      start: 0,
      end: Math.min(
        CHUNK_SIZE - 1,
        fileSize - 1
      )
    };
  }

  const match =
    range.match(/bytes=(\d*)-(\d*)/);

  if (!match) {
    return null;
  }

  let start =
    match[1] !== ""
      ? Number(match[1])
      : fileSize - Number(match[2]);

  let end =
    match[2] !== ""
      ? Number(match[2])
      : Math.min(
          start + CHUNK_SIZE - 1,
          fileSize - 1
        );

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start < 0 ||
    end < start ||
    start >= fileSize
  ) {
    return null;
  }

  end = Math.min(
    end,
    fileSize - 1
  );

  return {
    start,
    end
  };
}

async function downloadTelegramRange(
  video,
  start,
  end
) {
  const client =
    getTelegramClient();

  const documentId =
    BigInt(video.telegramDocumentId);

  const accessHash =
    BigInt(video.telegramAccessHash);

  const fileReference =
    Buffer.from(
      video.telegramFileReference,
      "base64"
    );

  const location =
    new Api.InputDocumentFileLocation({
      id: documentId,
      accessHash,
      fileReference
    });

  const requestedLength =
    end - start + 1;

  const chunks = [];

  let downloaded = 0;

  while (
    downloaded < requestedLength
  ) {
    const remaining =
      requestedLength - downloaded;

    const requestSize =
      Math.min(
        CHUNK_SIZE,
        remaining
      );

    const offset =
      start + downloaded;

    const result =
      await client.invoke(
        new Api.upload.GetFile({
          location,
          offset: BigInt(offset),
          limit: requestSize
        })
      );

    if (
      !result ||
      !result.bytes
    ) {
      throw new Error(
        "Telegram returned no file data."
      );
    }

    const buffer =
      Buffer.from(result.bytes);

    if (!buffer.length) {
      throw new Error(
        "Telegram returned an empty chunk."
      );
    }

    chunks.push(buffer);

    downloaded +=
      buffer.length;

    if (
      buffer.length <
      requestSize
    ) {
      break;
    }
  }

  return Buffer.concat(chunks);
}

router.get(
  "/:id",
  async (req, res) => {
    try {
      const video =
        await Video.findById(
          req.params.id
        );

      if (!video) {
        return res
          .status(404)
          .send("Video not found.");
      }

      if (
        !video.telegramDocumentId ||
        !video.telegramAccessHash ||
        !video.telegramFileReference
      ) {
        return res
          .status(400)
          .send(
            "This video does not have MTProto information. Send it to the bot again."
          );
      }

      const fileSize =
        Number(video.fileSize);

      if (
        !fileSize ||
        fileSize <= 0
      ) {
        return res
          .status(400)
          .send(
            "Video file size is unavailable."
          );
      }

      const range =
        parseRange(
          req.headers.range,
          fileSize
        );

      if (!range) {
        res.setHeader(
          "Content-Range",
          `bytes */${fileSize}`
        );

        return res
          .status(416)
          .send(
            "Invalid byte range."
          );
      }

      const {
        start,
        end
      } = range;

      console.log(
        `Streaming ${video.title}: ${start}-${end}/${fileSize}`
      );

      const data =
        await downloadTelegramRange(
          video,
          start,
          end
        );

      const actualEnd =
        start +
        data.length -
        1;

      res.status(
        req.headers.range
          ? 206
          : 200
      );

      res.setHeader(
        "Content-Type",
        video.mimeType ||
          "video/mp4"
      );

      res.setHeader(
        "Accept-Ranges",
        "bytes"
      );

      res.setHeader(
        "Content-Length",
        data.length
      );

      if (
        req.headers.range
      ) {
        res.setHeader(
          "Content-Range",
          `bytes ${start}-${actualEnd}/${fileSize}`
        );
      }

      res.setHeader(
        "Cache-Control",
        "no-store"
      );

      res.end(data);

    } catch (error) {
      console.error(
        "Telegram streaming error:",
        error
      );

      if (
        !res.headersSent
      ) {
        res
          .status(500)
          .send(
            "Unable to stream this video."
          );
      }
    }
  }
);

module.exports = router;
