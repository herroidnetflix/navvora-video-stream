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

  const match = range.match(
    /bytes=(\d*)-(\d*)/
  );

  if (!match) {
    return null;
  }

  let start;
  let end;

  if (match[1] !== "") {
    start = Number(match[1]);
  } else {
    const suffix = Number(match[2]);

    if (!Number.isFinite(suffix) || suffix <= 0) {
      return null;
    }

    start = Math.max(
      0,
      fileSize - suffix
    );
  }

  if (match[2] !== "") {
    end = Number(match[2]);
  } else {
    end = Math.min(
      start + CHUNK_SIZE - 1,
      fileSize - 1
    );
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
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


/*
 * Download a specific byte range
 * from Telegram through MTProto.
 */
async function downloadTelegramRange(
  video,
  start,
  end
) {
  const client = getTelegramClient();

  const documentId = BigInt(
    video.telegramDocumentId
  );

  const accessHash = BigInt(
    video.telegramAccessHash
  );

  const fileReference = Buffer.from(
    video.telegramFileReference,
    "base64"
  );


  /*
   * InputDocumentFileLocation
   *
   * thumbSize is required by the
   * GramJS version currently installed.
   */
  const location =
    new Api.InputDocumentFileLocation({
      id: documentId,
      accessHash: accessHash,
      fileReference: fileReference,
      thumbSize: ""
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


    console.log(
      `Telegram chunk: offset=${offset}, limit=${requestSize}`
    );


    const result =
      await client.invoke(
        new Api.upload.GetFile({
          location: location,
          offset: BigInt(offset),
          limit: requestSize,
          precise: false
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


    if (buffer.length === 0) {
      throw new Error(
        "Telegram returned an empty chunk."
      );
    }


    chunks.push(buffer);

    downloaded += buffer.length;


    /*
     * Stop if Telegram returned
     * less data than requested.
     */
    if (
      buffer.length < requestSize
    ) {
      break;
    }
  }


  return Buffer.concat(chunks);
}


/*
 * GET /api/stream/:id
 */
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
          .send(
            "Video not found."
          );
      }


      /*
       * The video must have been
       * processed by the updated bot.
       */
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
        !Number.isFinite(fileSize) ||
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


      if (
        !data ||
        data.length === 0
      ) {
        throw new Error(
          "No data received from Telegram."
        );
      }


      const actualEnd =
        start +
        data.length -
        1;


      /*
       * HTTP response
       */

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


      res.setHeader(
        "Content-Range",
        `bytes ${start}-${actualEnd}/${fileSize}`
      );


      /*
       * Disable caching for now.
       * This makes debugging easier.
       */
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


      if (!res.headersSent) {
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
