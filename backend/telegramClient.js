const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

let client = null;

async function startTelegramClient() {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const botToken = process.env.BOT_TOKEN;

  if (!apiId) {
    throw new Error("TELEGRAM_API_ID is missing");
  }

  if (!apiHash) {
    throw new Error("TELEGRAM_API_HASH is missing");
  }

  if (!botToken) {
    throw new Error("BOT_TOKEN is missing");
  }

  client = new TelegramClient(
    new StringSession(""),
    apiId,
    apiHash,
    {
      connectionRetries: 5
    }
  );

  await client.start({
    botAuthToken: botToken
  });

  console.log(
    "Telegram MTProto client connected."
  );

  return client;
}

function getTelegramClient() {
  if (!client) {
    throw new Error(
      "Telegram MTProto client has not been started."
    );
  }

  return client;
}

module.exports = {
  startTelegramClient,
  getTelegramClient
};
